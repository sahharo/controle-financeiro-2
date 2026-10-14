import type { Centavos } from './dinheiro';
import {
  chaveDeIso,
  chaveMes,
  diaDoMes,
  diasNoMes,
  diferencaMeses,
  inicioDoDia,
  somarDias,
  somarMeses,
  type ChaveMes,
} from './datas';
import type {
  Caixinha,
  Cartao,
  Categoria,
  Fixo,
  Gasto,
  Meta,
  Receita,
  Renda,
  Reserva,
} from '@/store/tipos';

/** Recorte do estado usado nos cálculos (facilita testar sem o store). */
export interface Dados {
  renda: Renda;
  receitas: Receita[];
  categorias: Categoria[];
  cartoes: Cartao[];
  gastos: Gasto[];
  fixos: Fixo[];
  metas: Meta[];
  caixinha: Caixinha;
  reserva: Reserva;
  /** Valores de prejuízo de meses anteriores lançados em cada mês. */
  ajustes: Record<ChaveMes, Centavos>;
}

// ---------------------------------------------------------------------------
// Gastos variáveis e parcelas

/** Valor da parcela `k` (0 = primeira); o resto da divisão vai para as primeiras. */
export function valorParcela(total: Centavos, parcelas: number, k: number): Centavos {
  const n = Math.max(1, parcelas);
  if (k < 0 || k >= n) return 0;
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return base + (k < resto ? 1 : 0);
}

/**
 * Quanto de um gasto pesa no orçamento de um mês. À vista: o mês da compra.
 * Parcelado: uma parcela por mês a partir do mês da compra.
 */
export function gastoNoMes(g: Gasto, mes: ChaveMes): Centavos {
  return valorParcela(g.valor, g.parcelas, diferencaMeses(chaveDeIso(g.data), mes));
}

export function variavelDoMes(gastos: Gasto[], mes: ChaveMes): Centavos {
  return gastos.reduce((s, g) => s + gastoNoMes(g, mes), 0);
}

export function gastoPorCategoria(gastos: Gasto[], mes: ChaveMes): Record<string, Centavos> {
  const r: Record<string, Centavos> = {};
  for (const g of gastos) {
    const v = gastoNoMes(g, mes);
    if (v) r[g.categoriaId] = (r[g.categoriaId] ?? 0) + v;
  }
  return r;
}

/** Parcelas de compras feitas antes de `mes` que caem nele (já comprometidas). */
export function parcelasComprometidas(gastos: Gasto[], mes: ChaveMes): Centavos {
  return gastos.reduce((s, g) => (chaveDeIso(g.data) < mes ? s + gastoNoMes(g, mes) : s), 0);
}

export function limitesTotais(categorias: Categoria[]): Centavos {
  return categorias.reduce((s, c) => s + c.limite, 0);
}

// ---------------------------------------------------------------------------
// Gastos fixos

/** Média dos últimos 3 valores pagos antes de `mes`; sem histórico, o valor de referência. */
export function estimativaFixo(f: Fixo, mes: ChaveMes): Centavos {
  const anteriores = Object.keys(f.pagamentos)
    .filter((m) => m < mes)
    .sort()
    .slice(-3)
    .map((m) => f.pagamentos[m]);
  if (!anteriores.length) return f.valor;
  return Math.round(anteriores.reduce((a, b) => a + b, 0) / anteriores.length);
}

/** Peso mensal de um fixo. Anuais entram divididos por 12. */
export function fixoNoMes(f: Fixo, mes: ChaveMes): Centavos {
  if (f.tipo === 'anual') return Math.round(f.valor / 12);
  const pago = f.pagamentos[mes];
  if (pago != null) return pago;
  return f.tipo === 'estimado' ? estimativaFixo(f, mes) : f.valor;
}

export function fixosDoMes(fixos: Fixo[], mes: ChaveMes): Centavos {
  return fixos.reduce((s, f) => s + fixoNoMes(f, mes), 0);
}

/** Custo mensal "de referência" dos fixos (sem depender de pagamentos do mês). */
export function fixosMensais(fixos: Fixo[], mes: ChaveMes): Centavos {
  return fixos.reduce(
    (s, f) =>
      s + (f.tipo === 'anual' ? Math.round(f.valor / 12) : f.tipo === 'estimado' ? estimativaFixo(f, mes) : f.valor),
    0,
  );
}

export interface Vencimento {
  fixo: Fixo;
  data: Date;
  valor: Centavos;
  estimado: boolean;
}

/** Fixos que vencem de hoje até `dias` à frente e ainda não foram pagos. */
export function proximosVencimentos(fixos: Fixo[], agora: Date, dias = 7): Vencimento[] {
  const hoje = inicioDoDia(agora);
  const limite = somarDias(hoje, dias);
  const r: Vencimento[] = [];
  for (const f of fixos) {
    for (const mes of [chaveMes(hoje), somarMeses(chaveMes(hoje), 1)]) {
      if (f.tipo === 'anual' && f.mesAnual !== Number(mes.slice(5)) - 1) continue;
      const data = diaDoMes(mes, f.dia);
      if (data < hoje || data > limite || f.pagamentos[mes] != null) continue;
      const valor = f.tipo === 'anual' ? f.valor : f.tipo === 'estimado' ? estimativaFixo(f, mes) : f.valor;
      r.push({ fixo: f, data, valor, estimado: f.tipo === 'estimado' });
    }
  }
  return r.sort((a, b) => a.data.getTime() - b.data.getTime());
}

// ---------------------------------------------------------------------------
// Entradas e dinheiro guardado

export function ganhoDoMes(renda: Renda, receitas: Receita[], mes: ChaveMes): Centavos {
  return renda.valor + receitas.filter((r) => chaveDeIso(r.data) === mes).reduce((s, r) => s + r.valor, 0);
}

/** Dinheiro que saiu da conta para metas, caixinha e reserva no mês (líquido de resgates). */
export function guardadoNoMes(d: Pick<Dados, 'metas' | 'caixinha' | 'reserva'>, mes: ChaveMes): Centavos {
  let s = 0;
  for (const m of d.metas) for (const dep of m.depositos) if (chaveDeIso(dep.data) === mes) s += dep.valor;
  for (const mov of [...d.caixinha.movimentos, ...d.reserva.movimentos]) {
    if (chaveDeIso(mov.data) !== mes) continue;
    if (mov.tipo === 'guardar') s += mov.valor;
    else if (mov.tipo === 'resgatar') s -= mov.valor;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Resumo do mês e "pode gastar hoje"

export interface ResumoMes {
  mes: ChaveMes;
  ganho: Centavos;
  fixos: Centavos;
  variavel: Centavos;
  ajuste: Centavos;
  guardado: Centavos;
  /** fixos + variáveis + prejuízo lançado no mês */
  gastoTotal: Centavos;
  limites: Centavos;
  /** O que sobraria se o mês fechasse agora. */
  saldo: Centavos;
  /** Sobra prevista no fim do mês, respeitando os limites das categorias. */
  previsaoSobra: Centavos;
  diasRestantes: number;
  /** Orçamento de hoje, antes dos gastos de hoje. */
  orcamentoHoje: Centavos;
  gastoHoje: Centavos;
  podeHoje: Centavos;
  /** Positivo: ontem gastou menos que o previsto. null quando não se aplica. */
  diferencaOntem: Centavos | null;
}

export function resumoDoMes(d: Dados, mes: ChaveMes, agora = new Date()): ResumoMes {
  const atual = chaveMes(agora);
  const ganho = ganhoDoMes(d.renda, d.receitas, mes);
  const fixos = fixosDoMes(d.fixos, mes);
  const variavel = variavelDoMes(d.gastos, mes);
  const ajuste = d.ajustes[mes] ?? 0;
  const guardado = guardadoNoMes(d, mes);
  const limites = limitesTotais(d.categorias);
  const base = ganho - fixos - ajuste - guardado;
  const saldo = base - variavel;

  let projecaoVariavel = variavel;
  if (mes >= atual) {
    if (limites > 0) projecaoVariavel = Math.max(variavel, limites);
    else if (mes === atual && variavel > 0)
      projecaoVariavel = Math.round((variavel / agora.getDate()) * diasNoMes(mes));
  }

  let diasRestantes = 0;
  let orcamentoHoje = 0;
  let gastoHoje = 0;
  let diferencaOntem: Centavos | null = null;

  if (mes === atual) {
    const hoje = inicioDoDia(agora);
    const ontem = somarDias(hoje, -1);
    let gastoOntem = 0;
    let antesDeHoje = 0;
    for (const g of d.gastos) {
      const v = gastoNoMes(g, mes);
      if (!v) continue;
      const data = new Date(g.data);
      // Parcelas de compras antigas já pesam desde o primeiro dia do mês.
      if (chaveDeIso(g.data) < mes || data < hoje) antesDeHoje += v;
      else gastoHoje += v;
      if (chaveDeIso(g.data) === mes && data >= ontem && data < hoje) gastoOntem += v;
    }
    diasRestantes = diasNoMes(mes) - agora.getDate() + 1;
    const disponivel = base - antesDeHoje;
    orcamentoHoje = Math.round(disponivel / diasRestantes);
    if (agora.getDate() > 1) {
      const orcamentoOntem = Math.round((disponivel + gastoOntem) / (diasRestantes + 1));
      diferencaOntem = orcamentoOntem - gastoOntem;
    }
  } else if (mes > atual) {
    diasRestantes = diasNoMes(mes);
    orcamentoHoje = Math.round(saldo / diasRestantes);
  }

  return {
    mes,
    ganho,
    fixos,
    variavel,
    ajuste,
    guardado,
    gastoTotal: fixos + variavel + ajuste,
    limites,
    saldo,
    previsaoSobra: base - projecaoVariavel,
    diasRestantes,
    orcamentoHoje,
    gastoHoje,
    podeHoje: orcamentoHoje - gastoHoje,
    diferencaOntem,
  };
}

/** Parte da renda do mês que já tem dono: fixos + parcelas antigas + prejuízo dividido. */
export function comprometidoDoMes(d: Dados, mes: ChaveMes): Centavos {
  return fixosMensais(d.fixos, mes) + parcelasComprometidas(d.gastos, mes) + (d.ajustes[mes] ?? 0);
}

// ---------------------------------------------------------------------------
// Prejuízo do mês anterior

export interface Prejuizo {
  mes: ChaveMes;
  valor: Centavos;
}

export function prejuizoPendente(
  d: Dados,
  agora: Date,
  inicioConta: ChaveMes,
  resolvidos: Record<ChaveMes, true>,
): Prejuizo | null {
  const anterior = somarMeses(chaveMes(agora), -1);
  if (anterior < inicioConta || resolvidos[anterior]) return null;
  const r = resumoDoMes(d, anterior, agora);
  return r.saldo < 0 ? { mes: anterior, valor: -r.saldo } : null;
}

/** Divide `valor` em `n` meses a partir de `mes`; retorna os ajustes por mês. */
export function dividirPrejuizo(valor: Centavos, mes: ChaveMes, n: number): Record<ChaveMes, Centavos> {
  const r: Record<ChaveMes, Centavos> = {};
  for (let k = 0; k < n; k++) r[somarMeses(mes, k)] = valorParcela(valor, n, k);
  return r;
}

// ---------------------------------------------------------------------------
// Cartão de crédito

/** Mês (AAAA-MM) em que fecha a fatura que recebe uma compra feita em `data`. */
export function mesFechamento(data: Date, c: Cartao): ChaveMes {
  const fechamento = diaDoMes(chaveMes(data), c.diaFechamento).getDate();
  return data.getDate() < fechamento ? chaveMes(data) : somarMeses(chaveMes(data), 1);
}

/** Mês de vencimento de uma fatura identificada pelo mês de fechamento. */
export function mesVencimento(fechamento: ChaveMes, c: Cartao): ChaveMes {
  return c.diaVencimento > c.diaFechamento ? fechamento : somarMeses(fechamento, 1);
}

export function dataFechamento(fechamento: ChaveMes, c: Cartao): Date {
  return diaDoMes(fechamento, c.diaFechamento);
}

export function dataVencimento(fechamento: ChaveMes, c: Cartao): Date {
  return diaDoMes(mesVencimento(fechamento, c), c.diaVencimento);
}

/** A fatura aberta hoje (identificada pelo mês de fechamento). */
export function faturaAberta(c: Cartao, agora: Date): ChaveMes {
  return mesFechamento(agora, c);
}

function comprasDoCartao(gastos: Gasto[], c: Cartao): Gasto[] {
  return gastos.filter((g) => g.pagamento.tipo === 'credito' && g.pagamento.cartaoId === c.id);
}

export function valorFatura(gastos: Gasto[], c: Cartao, fechamento: ChaveMes): Centavos {
  let s = 0;
  for (const g of comprasDoCartao(gastos, c)) {
    const k = diferencaMeses(mesFechamento(new Date(g.data), c), fechamento);
    s += valorParcela(g.valor, g.parcelas, k);
  }
  return s;
}

/** Soma do que ainda vai ser cobrado: fatura fechada não vencida + aberta + futuras. */
export function limiteUsado(gastos: Gasto[], c: Cartao, agora: Date): Centavos {
  const aberta = faturaAberta(c, agora);
  let s = 0;
  const anterior = somarMeses(aberta, -1);
  if (dataVencimento(anterior, c) >= inicioDoDia(agora)) s += valorFatura(gastos, c, anterior);
  for (const g of comprasDoCartao(gastos, c)) {
    const primeira = mesFechamento(new Date(g.data), c);
    const desde = Math.max(0, diferencaMeses(primeira, aberta));
    for (let k = desde; k < g.parcelas; k++) s += valorParcela(g.valor, g.parcelas, k);
  }
  return s;
}

export interface CompraParcelada {
  gasto: Gasto;
  parcelaAtual: number;
  valorParcela: Centavos;
  terminaEm: ChaveMes;
}

export function parceladasAtivas(gastos: Gasto[], c: Cartao, agora: Date): CompraParcelada[] {
  const aberta = faturaAberta(c, agora);
  const r: CompraParcelada[] = [];
  for (const g of comprasDoCartao(gastos, c)) {
    if (g.parcelas < 2) continue;
    const primeira = mesFechamento(new Date(g.data), c);
    const k = diferencaMeses(primeira, aberta);
    if (k >= g.parcelas) continue;
    const atual = Math.max(0, k);
    r.push({
      gasto: g,
      parcelaAtual: atual + 1,
      valorParcela: valorParcela(g.valor, g.parcelas, atual),
      terminaEm: mesVencimento(somarMeses(primeira, g.parcelas - 1), c),
    });
  }
  return r;
}

/** Mês de vencimento da fatura em que uma compra feita agora vai entrar. */
export function faturaDaCompra(c: Cartao, data: Date): ChaveMes {
  return mesVencimento(mesFechamento(data, c), c);
}

// ---------------------------------------------------------------------------
// Metas

export function guardadoNaMeta(m: Meta): Centavos {
  return m.depositos.reduce((s, d) => s + d.valor, 0);
}

/** Meses até concluir no ritmo do aporte mensal (null sem aporte). */
export function mesesParaMeta(m: Meta): number | null {
  const falta = m.alvo - guardadoNaMeta(m);
  if (falta <= 0) return 0;
  if (m.aporteMensal <= 0) return null;
  return Math.ceil(falta / m.aporteMensal);
}

/** Meses completos desde o último depósito (ou da criação). */
export function mesesSemDeposito(m: Meta, agora: Date): number {
  const ultimo = m.depositos.reduce((max, d) => (d.data > max ? d.data : max), m.criadaEm);
  return diferencaMeses(chaveDeIso(ultimo), chaveMes(agora));
}

// ---------------------------------------------------------------------------
// Reserva de emergência

export function saldoMovimentos(movs: { tipo: string; valor: Centavos }[]): Centavos {
  return movs.reduce((s, m) => (m.tipo === 'resgatar' ? s - m.valor : s + m.valor), 0);
}

/** Custo de vida = gastos fixos + limites dos variáveis. */
export function custoDeVida(d: Pick<Dados, 'fixos' | 'categorias'>, mes: ChaveMes): Centavos {
  return fixosMensais(d.fixos, mes) + limitesTotais(d.categorias);
}

// ---------------------------------------------------------------------------
// Simulador de compra

export const HORAS_MES = 176;

export function valorHora(renda: Centavos): Centavos {
  return Math.round(renda / HORAS_MES);
}

export function horasDeTrabalho(preco: Centavos, renda: Centavos): number {
  if (renda <= 0) return 0;
  return Math.round(preco / (renda / HORAS_MES));
}

export function fraseHoras(h: number): string {
  if (h < 1) return 'Menos de uma hora de trabalho.';
  if (h < 6) return 'Algumas horas de um dia de trabalho.';
  if (h <= 10) return 'Mais ou menos um dia inteiro de expediente.';
  if (h < 30) return `Cerca de ${Math.round(h / 8)} dias de expediente.`;
  if (h < 42) return 'Quase uma semana inteira de expediente.';
  if (h <= 48) return 'Uma semana inteira de expediente.';
  if (h < 150) return `Cerca de ${Math.round(h / 44)} semanas de expediente.`;
  const meses = h / HORAS_MES;
  return meses < 1.5 ? 'Cerca de um mês inteiro de trabalho.' : `Cerca de ${meses.toFixed(1).replace('.', ',')} meses de trabalho.`;
}

export interface PlanoGuardar {
  meses: number;
  porMes: Centavos;
  compraEm: ChaveMes;
}

/** Guardar até ~20% da sobra prevista por mês, arredondando a parcela para dezenas de reais. */
export function planoGuardar(preco: Centavos, sobraMensal: Centavos, agora: Date): PlanoGuardar {
  const capacidade = Math.max(sobraMensal * 0.2, 1);
  const meses = sobraMensal > 0 ? Math.min(24, Math.max(1, Math.ceil(preco / capacidade))) : 12;
  const porMes = Math.ceil(preco / meses / 1000) * 1000;
  return { meses, porMes, compraEm: somarMeses(chaveMes(agora), meses) };
}

export interface PlanoParcelar {
  parcelas: number;
  valorParcela: Centavos;
  impactoDiario: Centavos;
  ate: ChaveMes;
}

export function planoParcelar(preco: Centavos, agora: Date): PlanoParcelar {
  const parcelas = preco >= 50000 ? 10 : preco >= 15000 ? 3 : 1;
  const parcela = Math.ceil(preco / parcelas);
  return {
    parcelas,
    valorParcela: parcela,
    impactoDiario: Math.round(parcela / 30),
    ate: somarMeses(chaveMes(agora), parcelas),
  };
}
