import { alerta } from '@/lib/alerta';
import { carregarToken, chamar, conta, ErroApi, quandoSessaoExpirar } from '@/lib/api';
import { useStore, type Estado, type EstadoServidor } from '.';

// As telas mudam o estado local na hora (zustand). Este módulo compara o estado antes e
// depois de cada mudança e manda ao servidor só o que mudou, na ordem em que aconteceu.

const COLECOES = ['categorias', 'cartoes', 'gastos', 'fixos', 'receitas', 'metas'] as const;
const PERFIL = [
  'onboardingConcluido',
  'renda',
  'preferencias',
  'ajustes',
  'prejuizosResolvidos',
  'aprendidas',
  'desistencias',
  'conquistasDatas',
] as const;

type Item = { id: string } & Record<string, unknown>;
type Colecao = (typeof COLECOES)[number] | 'movimentos';

interface Operacoes {
  perfil: Record<string, unknown>;
  salvar: Map<Colecao, Item[]>;
  apagar: { colecao: Colecao; id: string }[];
}

function compararLista(colecao: Colecao, antes: Item[], depois: Item[], ops: Operacoes) {
  if (antes === depois) return;
  const anteriores = new Map(antes.map((x) => [x.id, x]));
  const atuais = new Set<string>();
  for (const item of depois) {
    atuais.add(item.id);
    // Atualizações são sempre imutáveis: objeto novo = item mudou.
    if (anteriores.get(item.id) !== item) {
      const lista = ops.salvar.get(colecao) ?? [];
      lista.push(item);
      ops.salvar.set(colecao, lista);
    }
  }
  for (const id of anteriores.keys()) if (!atuais.has(id)) ops.apagar.push({ colecao, id });
}

const comConta = (conta: 'caixinha' | 'reserva', lista: Item[]) => lista.map((m) => ({ ...m, conta }));

export function diferencas(a: Estado, b: Estado): Operacoes {
  const ops: Operacoes = { perfil: {}, salvar: new Map(), apagar: [] };
  for (const c of COLECOES) compararLista(c, a[c] as unknown as Item[], b[c] as unknown as Item[], ops);

  // Os movimentos da caixinha e da reserva vão para a mesma tabela; o objeto do item
  // muda (ganha "conta"), então comparamos pelas listas originais.
  for (const contaNome of ['caixinha', 'reserva'] as const) {
    const antes = a[contaNome].movimentos as unknown as Item[];
    const depois = b[contaNome].movimentos as unknown as Item[];
    if (antes === depois) continue;
    const parcial: Operacoes = { perfil: {}, salvar: new Map(), apagar: [] };
    compararLista('movimentos', antes, depois, parcial);
    const novos = comConta(contaNome, parcial.salvar.get('movimentos') ?? []);
    if (novos.length) ops.salvar.set('movimentos', [...(ops.salvar.get('movimentos') ?? []), ...novos]);
    ops.apagar.push(...parcial.apagar);
  }

  for (const k of PERFIL) if (a[k] !== b[k]) ops.perfil[k] = b[k];
  if (a.caixinha.percentualCdi !== b.caixinha.percentualCdi || a.caixinha.rendimentoAte !== b.caixinha.rendimentoAte)
    ops.perfil.caixinha = { percentualCdi: b.caixinha.percentualCdi, ...(b.caixinha.rendimentoAte ? { rendimentoAte: b.caixinha.rendimentoAte } : {}) };
  if (a.reserva.mesesAlvo !== b.reserva.mesesAlvo || a.reserva.aporteMensal !== b.reserva.aporteMensal)
    ops.perfil.reserva = { mesesAlvo: b.reserva.mesesAlvo, aporteMensal: b.reserva.aporteMensal };
  return ops;
}

const vazio = (o: Operacoes) => !Object.keys(o.perfil).length && !o.salvar.size && !o.apagar.length;

function corpo(item: Item) {
  const { id: _, ...resto } = item;
  return resto;
}

async function enviar(ops: Operacoes) {
  if (Object.keys(ops.perfil).length) await chamar('PATCH', '/api/perfil', ops.perfil);
  for (const [colecao, itens] of ops.salvar) {
    if (itens.length === 1) await chamar('PUT', `/api/${colecao}/${encodeURIComponent(itens[0].id)}`, corpo(itens[0]));
    else for (let i = 0; i < itens.length; i += 1000) await chamar('POST', `/api/${colecao}/lote`, itens.slice(i, i + 1000));
  }
  for (const { colecao, id } of ops.apagar) await chamar('DELETE', `/api/${colecao}/${encodeURIComponent(id)}`);
}

let fila: Promise<void> = Promise.resolve();
let aplicandoServidor = false;
let avisado = false;

function enfileirar(ops: Operacoes) {
  fila = fila.then(async () => {
    try {
      await enviar(ops);
      avisado = false;
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) return;
      // Para não divergir do servidor, voltamos ao que está salvo lá.
      if (!avisado)
        alerta(
          'Não deu para salvar',
          e instanceof ErroApi && e.codigo === 'sem_conexao'
            ? 'Sem conexão com o servidor. A última mudança foi desfeita; tente de novo quando a internet voltar.'
            : 'A última mudança foi desfeita. Tente de novo.',
        );
      avisado = true;
      await recarregar().catch(() => {});
    }
  });
  return fila;
}

/** Busca tudo no servidor e substitui os dados locais. */
export async function recarregar() {
  const e = await chamar<EstadoServidor>('GET', '/api/estado');
  aplicandoServidor = true;
  try {
    useStore.getState().aplicarServidor(e);
  } finally {
    aplicandoServidor = false;
  }
}

/** Espera os envios pendentes (ex.: antes de sair da conta). */
export const aguardarEnvios = () => fila;

let iniciado = false;

/** Liga a sincronização. Chamado uma vez quando o app abre. */
export async function iniciarSincronizacao() {
  if (iniciado) return;
  iniciado = true;
  quandoSessaoExpirar(() => {
    void conta.esquecerToken();
    useStore.getState().encerrarSessao();
  });
  useStore.subscribe((depois, antes) => {
    if (aplicandoServidor || !antes.logado || !depois.logado || antes.usuario?.email !== depois.usuario?.email) return;
    const ops = diferencas(antes, depois);
    if (!vazio(ops)) void enfileirar(ops);
  });
  await carregarToken();
  if (useStore.getState().logado) await recarregar().catch(() => {});
}
