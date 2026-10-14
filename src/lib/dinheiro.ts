// Todos os valores do app são guardados em centavos (inteiros) para evitar
// erros de arredondamento de ponto flutuante.
export type Centavos = number;

export const MENOS = '−';

function milhares(inteiro: number): string {
  return String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 128460 → "1.284,60" (sem sinal). */
export function fmt(c: Centavos): string {
  const abs = Math.abs(Math.round(c));
  const reais = Math.floor(abs / 100);
  const cent = abs % 100;
  return `${milhares(reais)},${String(cent).padStart(2, '0')}`;
}

/** 431000 → "4.310" (arredonda para reais, sem sinal). */
export function fmtInteiro(c: Centavos): string {
  return milhares(Math.round(Math.abs(c) / 100));
}

/** Com "R$" e sinal de menos tipográfico quando negativo. */
export function fmtR(c: Centavos, opts: { inteiro?: boolean } = {}): string {
  const corpo = opts.inteiro ? fmtInteiro(c) : fmt(c);
  return `${c < 0 ? MENOS : ''}R$ ${corpo}`;
}

/** Valor com sinal explícito: "+31,40" / "−45,90". */
export function fmtSinal(c: Centavos, opts: { inteiro?: boolean } = {}): string {
  const corpo = opts.inteiro ? fmtInteiro(c) : fmt(c);
  if (c > 0) return `+${corpo}`;
  if (c < 0) return `${MENOS}${corpo}`;
  return corpo;
}

/**
 * Lê um valor digitado em formato brasileiro ou internacional:
 * "1.299,00", "R$ 45,90", "45.90", "6200" → centavos. Retorna null se não houver número.
 */
export function lerValor(texto: string): Centavos | null {
  const limpo = texto.replace(/[^\d.,]/g, '');
  if (!/\d/.test(limpo)) return null;
  const ultVirgula = limpo.lastIndexOf(',');
  const ultPonto = limpo.lastIndexOf('.');
  let normal: string;
  if (ultVirgula > -1 && ultVirgula > ultPonto) {
    // vírgula é o separador decimal
    normal = limpo.replace(/\./g, '').replace(',', '.');
  } else if (ultPonto > -1) {
    const depois = limpo.length - ultPonto - 1;
    const pontos = (limpo.match(/\./g) ?? []).length;
    // "1.299" (3 dígitos após um único ponto) é milhar; "45.90" é decimal
    if (pontos === 1 && depois !== 3) normal = limpo.replace(/,/g, '');
    else normal = limpo.replace(/[.,]/g, '');
  } else {
    normal = limpo.replace(/,/g, '');
  }
  const n = Number(normal);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/**
 * Máscara de digitação estilo caixa eletrônico: os dígitos entram pela direita.
 * "123" → "1,23"; "620000" → "6.200,00".
 */
export function mascaraValor(digitado: string): { texto: string; centavos: Centavos } {
  const digitos = digitado.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  const centavos = digitos ? Number(digitos) : 0;
  return { texto: digitos ? fmt(centavos) : '', centavos };
}

export function pct(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}
