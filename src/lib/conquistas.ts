import { fmtInteiro } from './dinheiro';
import { chaveDeIso, chaveMes, diasNoMes, inicioDoDia, nomeMes, somarDias, somarMeses, type ChaveMes } from './datas';
import {
  custoDeVida,
  gastoPorCategoria,
  guardadoNaMeta,
  resumoDoMes,
  saldoMovimentos,
  type Dados,
} from './financas';

export interface Desistencia {
  item: string;
  horas: number;
  data: string;
}

export interface Conquista {
  id: string;
  titulo: string;
  /** Texto curto: o que falta ou como foi conquistada. */
  detalhe: string;
  progresso: number;
  conquistada: boolean;
}

function maiorSequenciaDeDias(datas: string[]): number {
  const dias = Array.from(new Set(datas.map((d) => inicioDoDia(new Date(d)).getTime()))).sort((a, b) => a - b);
  let melhor = 0;
  let atual = 0;
  let anterior = -Infinity;
  for (const d of dias) {
    atual = d - anterior <= 86_400_000 * 1.5 ? atual + 1 : 1;
    melhor = Math.max(melhor, atual);
    anterior = d;
  }
  return melhor;
}

function mesesFechados(inicioConta: ChaveMes, agora: Date): ChaveMes[] {
  const r: ChaveMes[] = [];
  for (let m = inicioConta; m < chaveMes(agora); m = somarMeses(m, 1)) r.push(m);
  return r;
}

export function calcularConquistas(
  d: Dados,
  ctx: { agora: Date; inicioConta: ChaveMes; desistencias: Desistencia[] },
): Conquista[] {
  const { agora, inicioConta, desistencias } = ctx;
  const mesAtual = chaveMes(agora);
  const r: Conquista[] = [];

  const gastosOrdenados = [...d.gastos].sort((a, b) => a.data.localeCompare(b.data));
  const primeiro = gastosOrdenados[0];
  r.push({
    id: 'primeiro-gasto',
    titulo: 'Primeiro gasto registrado',
    detalhe: primeiro ? `${primeiro.descricao || 'Gasto'} · ${nomeMes(chaveDeIso(primeiro.data))}` : 'Registre seu primeiro gasto',
    progresso: primeiro ? 1 : 0,
    conquistada: !!primeiro,
  });

  const seq = maiorSequenciaDeDias(d.gastos.map((g) => g.data));
  for (const [dias, titulo, ok] of [
    [7, '7 dias registrando', 'Uma semana sem esquecer nenhum gasto.'],
    [30, '30 dias registrando', 'Um mês sem esquecer nenhum gasto. Isso é o mais difícil.'],
  ] as const) {
    r.push({
      id: `${dias}-dias`,
      titulo,
      detalhe: seq >= dias ? ok : `Faltam ${dias - seq} ${dias - seq === 1 ? 'dia' : 'dias'} seguidos`,
      progresso: Math.min(1, seq / dias),
      conquistada: seq >= dias,
    });
  }

  r.push({
    id: 'cem-gastos',
    titulo: '100 gastos registrados',
    detalhe: d.gastos.length >= 100 ? 'Registrar virou hábito.' : `Faltam ${100 - d.gastos.length}`,
    progresso: Math.min(1, d.gastos.length / 100),
    conquistada: d.gastos.length >= 100,
  });

  const primeiraMeta = [...d.metas].sort((a, b) => a.criadaEm.localeCompare(b.criadaEm))[0];
  r.push({
    id: 'primeira-meta',
    titulo: 'Primeira meta criada',
    detalhe: primeiraMeta ? `${primeiraMeta.nome} · ${nomeMes(chaveDeIso(primeiraMeta.criadaEm))}` : 'Crie uma meta',
    progresso: primeiraMeta ? 1 : 0,
    conquistada: !!primeiraMeta,
  });

  const melhorMeta = d.metas.reduce((m, x) => Math.max(m, x.alvo ? guardadoNaMeta(x) / x.alvo : 0), 0);
  const concluida = d.metas.find((m) => guardadoNaMeta(m) >= m.alvo && m.alvo > 0);
  r.push({
    id: 'meta-concluida',
    titulo: 'Meta concluída',
    detalhe: concluida ? concluida.nome : 'Chegue a 100% de uma meta',
    progresso: Math.min(1, melhorMeta),
    conquistada: !!concluida,
  });

  const fechados = mesesFechados(inicioConta, agora);
  const azul = fechados.map((m) => resumoDoMes(d, m, agora).saldo >= 0);
  const algumAzul = azul.some(Boolean);
  const resumoAtual = resumoDoMes(d, mesAtual, agora);
  r.push({
    id: 'mes-azul',
    titulo: 'Primeiro mês no azul',
    detalhe: algumAzul
      ? `${nomeMes(fechados[azul.indexOf(true)], true)} fechou sem prejuízo`
      : `Feche ${nomeMes(mesAtual)} sem prejuízo`,
    progresso: algumAzul ? 1 : resumoAtual.previsaoSobra >= 0 ? agora.getDate() / diasNoMes(mesAtual) : 0,
    conquistada: algumAzul,
  });

  let seguidos = 0;
  let maxSeguidos = 0;
  for (const ok of azul) {
    seguidos = ok ? seguidos + 1 : 0;
    maxSeguidos = Math.max(maxSeguidos, seguidos);
  }
  r.push({
    id: 'tres-azul',
    titulo: '3 meses seguidos no azul',
    detalhe: maxSeguidos >= 3 ? 'Constância é tudo.' : `${seguidos} de 3 até agora`,
    progresso: Math.min(1, Math.max(maxSeguidos, seguidos) / 3),
    conquistada: maxSeguidos >= 3,
  });

  const limitesOk = fechados.some((m) => {
    if (!d.categorias.length) return false;
    const por = gastoPorCategoria(d.gastos, m);
    return d.categorias.every((c) => (por[c.id] ?? 0) <= c.limite);
  });
  r.push({
    id: 'limites-ok',
    titulo: 'Mês inteiro dentro dos limites',
    detalhe: limitesOk ? 'Nenhuma categoria estourou.' : 'Feche um mês sem estourar nenhuma categoria',
    progresso: limitesOk ? 1 : 0,
    conquistada: limitesOk,
  });

  const custo = custoDeVida(d, mesAtual);
  const saldoReserva = saldoMovimentos(d.reserva.movimentos);
  for (const n of [1, 3, 6]) {
    const alvo = custo * n;
    const ok = alvo > 0 && saldoReserva >= alvo;
    r.push({
      id: `reserva-${n}`,
      titulo: `Reserva de ${n} ${n === 1 ? 'mês' : 'meses'}`,
      detalhe: ok ? 'Guardado para imprevistos.' : alvo > 0 ? `Faltam R$ ${fmtInteiro(alvo - saldoReserva)}` : 'Cadastre seus gastos fixos',
      progresso: alvo > 0 ? Math.min(1, Math.max(0, saldoReserva / alvo)) : 0,
      conquistada: ok,
    });
  }

  const guardouCaixinha = d.caixinha.movimentos.some((m) => m.tipo === 'guardar');
  r.push({
    id: 'caixinha',
    titulo: 'Começou a caixinha',
    detalhe: guardouCaixinha ? 'O dinheiro já está rendendo.' : 'Guarde qualquer valor na caixinha',
    progresso: guardouCaixinha ? 1 : 0,
    conquistada: guardouCaixinha,
  });

  const horas = desistencias.reduce((s, x) => s + x.horas, 0);
  r.push({
    id: 'desistiu',
    titulo: 'Desistiu de uma compra no simulador',
    detalhe: desistencias.length ? `Economizou ${horas} ${horas === 1 ? 'hora' : 'horas'} de trabalho` : 'Use o simulador antes de comprar',
    progresso: desistencias.length ? 1 : 0,
    conquistada: desistencias.length > 0,
  });

  return r;
}

/** "ontem", "hoje", "há 3 dias", ou o nome do mês. */
export function quandoConquistou(iso: string, agora: Date): string {
  const dias = Math.round((inicioDoDia(agora).getTime() - inicioDoDia(new Date(iso)).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return nomeMes(chaveDeIso(iso));
}

export function recente(iso: string | undefined, agora: Date): boolean {
  return !!iso && new Date(iso) >= somarDias(inicioDoDia(agora), -7);
}
