import type { Centavos } from './dinheiro';
import {
  chaveDeIso,
  chaveMes,
  diaUtil,
  diasNoMes,
  inicioDoMes,
  somarDias,
  somarMeses,
  type ChaveMes,
} from './datas';
import { novoId } from './id';
import type { Caixinha, Movimento } from '@/store/tipos';

/** CDI usado até a primeira atualização pela internet. */
export const CDI_PADRAO = 14.9;

/** Tabela regressiva do IR para renda fixa, pelo tempo que o dinheiro ficou guardado. */
export function aliquotaIR(diasGuardado: number): number {
  if (diasGuardado <= 180) return 0.225;
  if (diasGuardado <= 360) return 0.2;
  if (diasGuardado <= 720) return 0.175;
  return 0.15;
}

export function taxaDiaria(cdiAnual: number, percentualCdi: number): number {
  return (Math.pow(1 + cdiAnual / 100, 1 / 252) - 1) * (percentualCdi / 100);
}

function saldoAntesDe(movs: Movimento[], data: Date): Centavos {
  const limite = data.getTime();
  return movs.reduce((s, m) => {
    if (new Date(m.data).getTime() >= limite) return s;
    return m.tipo === 'resgatar' ? s - m.valor : s + m.valor;
  }, 0);
}

export function saldoCaixinha(c: Caixinha): Centavos {
  return c.movimentos.reduce((s, m) => (m.tipo === 'resgatar' ? s - m.valor : s + m.valor), 0);
}

/** Idade média (em dias) do dinheiro guardado, ponderada pelos depósitos. */
function idadeMedia(movs: Movimento[], ate: Date): number {
  let soma = 0;
  let peso = 0;
  for (const m of movs) {
    if (m.tipo !== 'guardar') continue;
    const d = new Date(m.data);
    if (d >= ate) continue;
    soma += ((ate.getTime() - d.getTime()) / 86_400_000) * m.valor;
    peso += m.valor;
  }
  return peso ? soma / peso : 0;
}

/**
 * Rendimento líquido de um mês: juros diários sobre o saldo de cada dia útil,
 * menos o IR pela idade média do dinheiro guardado.
 */
export function rendimentoDoMes(c: Caixinha, mes: ChaveMes, cdiAnual: number, saldoFixo?: Centavos): Centavos {
  const taxa = taxaDiaria(cdiAnual, c.percentualCdi);
  const inicio = inicioDoMes(mes);
  const fim = somarDias(inicio, diasNoMes(mes));
  let bruto = 0;
  let acumulado = 0;
  for (let d = inicio; d < fim; d = somarDias(d, 1)) {
    if (!diaUtil(d)) continue;
    const saldo = (saldoFixo ?? saldoAntesDe(c.movimentos, somarDias(d, 1))) + acumulado;
    if (saldo <= 0) continue;
    const juros = saldo * taxa;
    bruto += juros;
    acumulado += juros;
  }
  const ir = aliquotaIR(idadeMedia(c.movimentos, fim));
  return Math.round(bruto * (1 - ir));
}

/** Estimativa do mês atual com o saldo de hoje. */
export function rendimentoPrevisto(c: Caixinha, agora: Date, cdiAnual: number): Centavos {
  return rendimentoDoMes(c, chaveMes(agora), cdiAnual, saldoCaixinha(c));
}

/** Lança o rendimento dos meses já fechados que ainda não foram lançados. */
export function lancarRendimentos(c: Caixinha, agora: Date, cdiAnual: number): Caixinha {
  const depositos = c.movimentos.filter((m) => m.tipo === 'guardar');
  if (!depositos.length) return c;
  const primeiro = depositos.map((m) => chaveDeIso(m.data)).sort()[0];
  const ultimoFechado = somarMeses(chaveMes(agora), -1);
  let mes = c.rendimentoAte ? somarMeses(c.rendimentoAte, 1) : primeiro;
  if (mes > ultimoFechado) return c;
  let atual = c;
  for (; mes <= ultimoFechado; mes = somarMeses(mes, 1)) {
    const valor = rendimentoDoMes(atual, mes, cdiAnual);
    const fimDoMes = somarDias(inicioDoMes(somarMeses(mes, 1)), -1);
    fimDoMes.setHours(23, 0, 0, 0);
    const movimentos =
      valor > 0
        ? [...atual.movimentos, { id: novoId(), tipo: 'rendimento' as const, valor, data: fimDoMes.toISOString() }]
        : atual.movimentos;
    atual = { ...atual, movimentos, rendimentoAte: mes };
  }
  return atual;
}

/** Busca o CDI anualizado mais recente no Banco Central (série SGS 4389). */
export async function buscarCdi(): Promise<number | null> {
  try {
    const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json');
    if (!r.ok) return null;
    const dados = (await r.json()) as { valor: string }[];
    const v = Number(String(dados[0]?.valor).replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
