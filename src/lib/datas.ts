// Datas são guardadas como ISO (string). Meses são identificados por "AAAA-MM".
export type ChaveMes = string;

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

export function chaveMes(d: Date): ChaveMes {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function chaveDeIso(iso: string): ChaveMes {
  return chaveMes(new Date(iso));
}

export function inicioDoMes(chave: ChaveMes): Date {
  const [a, m] = chave.split('-').map(Number);
  return new Date(a, m - 1, 1);
}

export function somarMeses(chave: ChaveMes, n: number): ChaveMes {
  const d = inicioDoMes(chave);
  d.setMonth(d.getMonth() + n);
  return chaveMes(d);
}

/** Quantos meses de `de` até `ate` (pode ser negativo). */
export function diferencaMeses(de: ChaveMes, ate: ChaveMes): number {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export function diasNoMes(chave: ChaveMes): number {
  const [a, m] = chave.split('-').map(Number);
  return new Date(a, m, 0).getDate();
}

export function nomeMes(chave: ChaveMes, capitalizar = false): string {
  const m = Number(chave.split('-')[1]) - 1;
  const nome: string = MESES[m];
  return capitalizar ? nome[0].toUpperCase() + nome.slice(1) : nome;
}

export function mesCurto(chave: ChaveMes): string {
  return nomeMes(chave).slice(0, 3);
}

/** "nov/2029" */
export function mesAno(chave: ChaveMes): string {
  return `${mesCurto(chave)}/${chave.slice(0, 4)}`;
}

export function diaSemanaCurto(d: Date): string {
  return DIAS_SEMANA[d.getDay()];
}

export function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function somarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Data de um dia do mês, ajustada para o último dia quando o mês é mais curto. */
export function diaDoMes(chave: ChaveMes, dia: number): Date {
  const [a, m] = chave.split('-').map(Number);
  return new Date(a, m - 1, Math.min(dia, diasNoMes(chave)));
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "hoje, 20:14", "ontem", "12 de outubro" */
export function quando(iso: string, agora = new Date(), comHora = false): string {
  const d = new Date(iso);
  if (mesmoDia(d, agora)) return comHora ? `hoje, ${hhmm(d)}` : 'hoje';
  if (mesmoDia(d, somarDias(agora, -1))) return comHora ? `ontem, ${hhmm(d)}` : 'ontem';
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function capitalizar(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function diaUtil(d: Date): boolean {
  const s = d.getDay();
  return s !== 0 && s !== 6;
}

/** Dias úteis (seg a sex) entre duas datas, incluindo `de` e excluindo `ate`. */
export function diasUteisEntre(de: Date, ate: Date): number {
  let n = 0;
  for (let d = inicioDoDia(de); d < ate; d = somarDias(d, 1)) if (diaUtil(d)) n++;
  return n;
}
