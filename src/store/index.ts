import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Desistencia } from '@/lib/conquistas';
import { chaveMes, type ChaveMes } from '@/lib/datas';
import type { Centavos } from '@/lib/dinheiro';
import { dividirPrejuizo, type Dados } from '@/lib/financas';
import { novoId } from '@/lib/id';
import type { Lancamento } from '@/lib/importacao';
import { categoriaPorPalavra, normalizar } from '@/lib/interpretar';
import { CDI_PADRAO, lancarRendimentos } from '@/lib/rendimento';
import type {
  Cartao,
  Categoria,
  Fixo,
  Gasto,
  Meta,
  Movimento,
  Preferencias,
  Receita,
  Renda,
  Reserva,
  Taxas,
  TipoMovimento,
  Usuario,
} from './tipos';

export * from './tipos';

interface Dominio extends Dados {
  usuario: Usuario | null;
  logado: boolean;
  onboardingConcluido: boolean;
  prejuizosResolvidos: Record<ChaveMes, true>;
  /** descrição normalizada → categoria escolhida pela pessoa */
  aprendidas: Record<string, string>;
  desistencias: Desistencia[];
  conquistasDatas: Record<string, string>;
  taxas: Taxas;
  preferencias: Preferencias;
}

/** O que vem do servidor em GET /api/estado. */
export type EstadoServidor = Omit<Dominio, 'logado'>;

interface Acoes {
  /** Depois de entrar ou criar conta: limpa o que havia e guarda quem entrou. */
  abrirSessao(u: Usuario): void;
  /** Substitui os dados locais pelos do servidor. */
  aplicarServidor(e: EstadoServidor): void;
  encerrarSessao(): void;
  desbloquear(): void;
  concluirOnboarding(p: { renda: Renda; fixos: Omit<Fixo, 'id' | 'pagamentos'>[]; cartao?: Omit<Cartao, 'id'> }): void;
  setRenda(r: Renda): void;

  salvarGasto(g: Omit<Gasto, 'id'> & { id?: string }): void;
  removerGasto(id: string): void;
  importarLancamentos(l: Lancamento[]): number;

  salvarCategoria(c: Omit<Categoria, 'id'> & { id?: string }): void;
  setLimites(limites: Record<string, Centavos>): void;
  removerCategoria(id: string): void;

  salvarCartao(c: Omit<Cartao, 'id'> & { id?: string }): string;
  removerCartao(id: string): void;

  salvarFixo(f: Omit<Fixo, 'id' | 'pagamentos'> & { id?: string }): void;
  removerFixo(id: string): void;
  marcarPago(id: string, mes: ChaveMes, valor: Centavos | null): void;

  salvarReceita(r: Omit<Receita, 'id'>): void;
  removerReceita(id: string): void;

  salvarMeta(m: Pick<Meta, 'nome' | 'alvo' | 'aporteMensal'> & { id?: string }): string;
  removerMeta(id: string): void;
  depositarMeta(id: string, valor: Centavos): void;

  movimentarCaixinha(tipo: Exclude<TipoMovimento, 'rendimento'>, valor: Centavos, nota?: string): void;
  aplicarRendimentos(agora: Date): void;
  setPercentualCdi(p: number): void;

  movimentarReserva(tipo: Exclude<TipoMovimento, 'rendimento'>, valor: Centavos): void;
  setReserva(p: Partial<Pick<Reserva, 'mesesAlvo' | 'aporteMensal'>>): void;

  resolverPrejuizo(mes: ChaveMes, valor: Centavos, meses: number, aPartir: ChaveMes): void;
  registrarDesistencia(d: Desistencia): void;
  marcarConquistas(ids: string[]): void;
  setTaxas(t: Taxas): void;
  setPreferencias(p: Partial<Preferencias>): void;
}

export type Estado = Dominio & Acoes & { hidratado: boolean; desbloqueado: boolean };

export const CATEGORIAS_PADRAO: { nome: string; peso: number }[] = [
  { nome: 'Mercado', peso: 0.3 },
  { nome: 'Alimentação', peso: 0.25 },
  { nome: 'Transporte', peso: 0.15 },
  { nome: 'Lazer', peso: 0.1 },
  { nome: 'Casa', peso: 0.1 },
];

function dominioInicial(): Dominio {
  return {
    usuario: null,
    logado: false,
    onboardingConcluido: false,
    renda: { valor: 0, diaPagamento: { tipo: 'dia', dia: 5 }, variavel: false },
    receitas: [],
    categorias: [],
    cartoes: [],
    gastos: [],
    fixos: [],
    metas: [],
    caixinha: { percentualCdi: 100, movimentos: [] },
    reserva: { mesesAlvo: 6, aporteMensal: 0, movimentos: [] },
    ajustes: {},
    prejuizosResolvidos: {},
    aprendidas: {},
    desistencias: [],
    conquistasDatas: {},
    taxas: { cdiAnual: CDI_PADRAO },
    preferencias: { lembrarVencimentos: true, biometriaAoAbrir: false },
  };
}

/** Limites sugeridos: 80% do que sobra depois dos fixos, dividido por pesos. */
export function limitesSugeridos(renda: Centavos, fixosMensais: Centavos): Record<string, Centavos> {
  const livre = Math.max(0, renda - fixosMensais) * 0.8;
  const r: Record<string, Centavos> = {};
  for (const c of CATEGORIAS_PADRAO) r[c.nome] = Math.round((livre * c.peso) / 1000) * 1000;
  return r;
}

function substituir<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
}

function movimento(tipo: TipoMovimento, valor: Centavos, nota?: string): Movimento {
  return { id: novoId(), tipo, valor, data: new Date().toISOString(), ...(nota ? { nota } : {}) };
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...dominioInicial(),
      hidratado: false,
      desbloqueado: false,

      abrirSessao: (usuario) => set({ ...dominioInicial(), usuario, logado: true, desbloqueado: true }),
      aplicarServidor: (e) => set({ ...e, logado: true }),
      encerrarSessao: () => set({ ...dominioInicial(), desbloqueado: false }),
      desbloquear: () => set({ desbloqueado: true }),

      concluirOnboarding: ({ renda, fixos, cartao }) => {
        const novosFixos: Fixo[] = fixos.map((f) => ({ ...f, id: novoId(), pagamentos: {} }));
        const mensal = novosFixos.reduce((s, f) => s + (f.tipo === 'anual' ? Math.round(f.valor / 12) : f.valor), 0);
        const sugeridos = limitesSugeridos(renda.valor, mensal);
        const categorias =
          get().categorias.length > 0
            ? get().categorias
            : CATEGORIAS_PADRAO.map((c) => ({ id: novoId(), nome: c.nome, limite: sugeridos[c.nome] }));
        set((s) => ({
          renda,
          fixos: [...s.fixos, ...novosFixos],
          cartoes: cartao ? [...s.cartoes, { ...cartao, id: novoId() }] : s.cartoes,
          categorias,
          onboardingConcluido: true,
        }));
      },
      setRenda: (renda) => set({ renda }),

      salvarGasto: (g) => {
        const gasto: Gasto = { ...g, id: g.id ?? novoId() };
        set((s) => {
          const chave = normalizar(gasto.descricao);
          return {
            gastos: substituir(s.gastos, gasto),
            aprendidas: chave ? { ...s.aprendidas, [chave]: gasto.categoriaId } : s.aprendidas,
          };
        });
      },
      removerGasto: (id) => set((s) => ({ gastos: s.gastos.filter((g) => g.id !== id) })),
      importarLancamentos: (lancamentos) => {
        const s = get();
        let categorias = s.categorias;
        let outros = categorias.find((c) => normalizar(c.nome) === 'outros');
        if (!outros) {
          outros = { id: novoId(), nome: 'Outros', limite: 0 };
          categorias = [...categorias, outros];
        }
        const existentes = new Set(s.gastos.map((g) => `${g.data.slice(0, 10)}|${g.valor}|${normalizar(g.descricao)}`));
        const novos: Gasto[] = [];
        for (const l of lancamentos) {
          const chave = `${l.data.slice(0, 10)}|${l.valor}|${normalizar(l.descricao)}`;
          if (existentes.has(chave)) continue;
          existentes.add(chave);
          const aprendida = s.aprendidas[normalizar(l.descricao)];
          const categoriaId =
            (aprendida && categorias.some((c) => c.id === aprendida) ? aprendida : undefined) ??
            categoriaPorPalavra(l.descricao, categorias)?.id ??
            outros.id;
          novos.push({
            id: novoId(),
            descricao: l.descricao,
            valor: l.valor,
            categoriaId,
            pagamento: { tipo: 'debito' },
            data: l.data,
            parcelas: 1,
          });
        }
        set({ categorias, gastos: [...s.gastos, ...novos] });
        return novos.length;
      },

      salvarCategoria: (c) => set((s) => ({ categorias: substituir(s.categorias, { ...c, id: c.id ?? novoId() }) })),
      setLimites: (limites) =>
        set((s) => ({ categorias: s.categorias.map((c) => (c.id in limites ? { ...c, limite: limites[c.id] } : c)) })),
      removerCategoria: (id) =>
        set((s) => {
          const restantes = s.categorias.filter((c) => c.id !== id);
          let categorias = restantes;
          let destino = restantes.find((c) => normalizar(c.nome) === 'outros');
          if (!destino && s.gastos.some((g) => g.categoriaId === id)) {
            destino = { id: novoId(), nome: 'Outros', limite: 0 };
            categorias = [...restantes, destino];
          }
          return {
            categorias,
            gastos: destino ? s.gastos.map((g) => (g.categoriaId === id ? { ...g, categoriaId: destino!.id } : g)) : s.gastos,
          };
        }),

      salvarCartao: (c) => {
        const id = c.id ?? novoId();
        set((s) => ({ cartoes: substituir(s.cartoes, { ...c, id }) }));
        return id;
      },
      removerCartao: (id) =>
        set((s) => ({
          cartoes: s.cartoes.filter((c) => c.id !== id),
          // Compras feitas no cartão removido continuam no histórico, como débito.
          gastos: s.gastos.map((g) =>
            g.pagamento.tipo === 'credito' && g.pagamento.cartaoId === id ? { ...g, pagamento: { tipo: 'debito' } } : g,
          ),
        })),

      salvarFixo: (f) =>
        set((s) => {
          const antigo = f.id ? s.fixos.find((x) => x.id === f.id) : undefined;
          return { fixos: substituir(s.fixos, { ...f, id: f.id ?? novoId(), pagamentos: antigo?.pagamentos ?? {} }) };
        }),
      removerFixo: (id) => set((s) => ({ fixos: s.fixos.filter((f) => f.id !== id) })),
      marcarPago: (id, mes, valor) =>
        set((s) => ({
          fixos: s.fixos.map((f) => {
            if (f.id !== id) return f;
            const pagamentos = { ...f.pagamentos };
            if (valor == null) delete pagamentos[mes];
            else pagamentos[mes] = valor;
            return { ...f, pagamentos };
          }),
        })),

      salvarReceita: (r) => set((s) => ({ receitas: [...s.receitas, { ...r, id: novoId() }] })),
      removerReceita: (id) => set((s) => ({ receitas: s.receitas.filter((r) => r.id !== id) })),

      salvarMeta: (m) => {
        const id = m.id ?? novoId();
        set((s) => {
          const antiga = s.metas.find((x) => x.id === id);
          const meta: Meta = antiga
            ? { ...antiga, ...m, id }
            : { ...m, id, depositos: [], criadaEm: new Date().toISOString() };
          return { metas: substituir(s.metas, meta) };
        });
        return id;
      },
      removerMeta: (id) => set((s) => ({ metas: s.metas.filter((m) => m.id !== id) })),
      depositarMeta: (id, valor) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === id ? { ...m, depositos: [...m.depositos, { id: novoId(), valor, data: new Date().toISOString() }] } : m,
          ),
        })),

      movimentarCaixinha: (tipo, valor, nota) =>
        set((s) => ({ caixinha: { ...s.caixinha, movimentos: [...s.caixinha.movimentos, movimento(tipo, valor, nota)] } })),
      aplicarRendimentos: (agora) => {
        const s = get();
        const nova = lancarRendimentos(s.caixinha, agora, s.taxas.cdiAnual);
        if (nova !== s.caixinha) set({ caixinha: nova });
      },
      setPercentualCdi: (p) => set((s) => ({ caixinha: { ...s.caixinha, percentualCdi: p } })),

      movimentarReserva: (tipo, valor) =>
        set((s) => ({ reserva: { ...s.reserva, movimentos: [...s.reserva.movimentos, movimento(tipo, valor)] } })),
      setReserva: (p) => set((s) => ({ reserva: { ...s.reserva, ...p } })),

      resolverPrejuizo: (mes, valor, meses, aPartir) =>
        set((s) => {
          const ajustes = { ...s.ajustes };
          for (const [m, v] of Object.entries(dividirPrejuizo(valor, aPartir, meses))) ajustes[m] = (ajustes[m] ?? 0) + v;
          return { ajustes, prejuizosResolvidos: { ...s.prejuizosResolvidos, [mes]: true } };
        }),
      registrarDesistencia: (d) => set((s) => ({ desistencias: [...s.desistencias, d] })),
      marcarConquistas: (ids) =>
        set((s) => {
          const agora = new Date().toISOString();
          const datas = { ...s.conquistasDatas };
          for (const id of ids) datas[id] ??= agora;
          return { conquistasDatas: datas };
        }),
      setTaxas: (taxas) => set({ taxas }),
      setPreferencias: (p) => set((s) => ({ preferencias: { ...s.preferencias, ...p } })),
    }),
    {
      // Cópia local do que está no servidor: o app abre na hora e mostra os dados mesmo sem internet.
      name: 'sobra-dados',
      // v1 guardava tudo só no aparelho; a partir da v2 os dados vêm do servidor.
      version: 2,
      migrate: () => dominioInicial(),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hidratado, desbloqueado, ...resto }) =>
        Object.fromEntries(Object.entries(resto).filter(([, v]) => typeof v !== 'function')) as unknown as Dominio,
      onRehydrateStorage: () => () => {
        useStore.setState({ hidratado: true });
      },
    },
  ),
);

/** Mês de criação da conta (antes dele não há prejuízo a cobrar). */
export function mesInicioConta(s: Pick<Dominio, 'usuario'>): ChaveMes {
  return s.usuario ? chaveMes(new Date(s.usuario.criadoEm)) : chaveMes(new Date());
}
