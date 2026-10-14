import type { Centavos } from './dinheiro';
import { lerValor } from './dinheiro';
import type { Cartao, Categoria, FormaPagamento } from '@/store/tipos';

const ACENTOS: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o', ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c', ñ: 'n',
};

/** Minúsculas e sem acentos (sem depender de String.normalize, que nem todo Hermes tem). */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, (c) => ACENTOS[c])
    .trim();
}

// ---------------------------------------------------------------------------
// Números por extenso ("quarenta e cinco e noventa" → 45 e 90)

const UNIDADES: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
};
const DEZ_A_DEZENOVE: Record<string, number> = {
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15,
  dezesseis: 16, dezasseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
};
const DEZENAS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
};
const CENTENAS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600,
  seiscentas: 600, setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800,
  novecentos: 900, novecentas: 900,
};

type Classe = { valor: number; nivel: number };

function classePalavra(p: string): Classe | null {
  if (p in CENTENAS) return { valor: CENTENAS[p], nivel: 3 };
  if (p in DEZENAS) return { valor: DEZENAS[p], nivel: 2 };
  // 10–19 ocupam a dezena e a unidade de uma vez
  if (p in DEZ_A_DEZENOVE) return { valor: DEZ_A_DEZENOVE[p], nivel: 1.5 };
  if (p in UNIDADES) return { valor: UNIDADES[p], nivel: 1 };
  return null;
}

export function ehPalavraNumero(p: string): boolean {
  return classePalavra(p) !== null || p === 'mil';
}

interface Numero {
  valor: number;
  /** "reais" logo depois */
  reais?: boolean;
  /** "centavos" logo depois */
  centavos?: boolean;
  /** já veio com casas decimais ("45,90") — valor em centavos */
  emCentavos?: boolean;
}

/** Extrai a sequência de números (por extenso ou em dígitos) de uma lista de tokens. */
export function extrairNumeros(tokens: string[]): Numero[] {
  const r: Numero[] = [];
  let total = 0;
  let grupo = 0;
  let nivel = Infinity;
  let aberto = false;

  const fechar = () => {
    if (aberto) r.push({ valor: total + grupo });
    total = 0;
    grupo = 0;
    nivel = Infinity;
    aberto = false;
  };

  for (const t of tokens) {
    if (/^\d/.test(t)) {
      fechar();
      if (/[.,]\d{1,2}$/.test(t)) r.push({ valor: lerValor(t) ?? 0, emCentavos: true });
      else r.push({ valor: Math.round((lerValor(t) ?? 0) / 100) });
      continue;
    }
    if (t === 'e' && aberto) continue;
    if (t === 'mil') {
      total += (grupo || 1) * 1000;
      grupo = 0;
      nivel = 4;
      aberto = true;
      continue;
    }
    if (t === 'reais' || t === 'real' || t === 'conto' || t === 'contos' || t === 'pila') {
      fechar();
      if (r.length) r[r.length - 1].reais = true;
      continue;
    }
    if (t === 'centavos' || t === 'centavo') {
      fechar();
      if (r.length) r[r.length - 1].centavos = true;
      continue;
    }
    const c = classePalavra(t);
    if (!c) {
      fechar();
      continue;
    }
    if (!(c.nivel < nivel)) fechar();
    grupo += c.valor;
    nivel = c.nivel === 1.5 ? 1 : c.nivel;
    // "cem" não aceita complemento ("cento e um" é o certo)
    if (t === 'cem') nivel = 0;
    aberto = true;
  }
  fechar();
  return r;
}

/** Converte os números ditos em um valor em centavos: "45 e 90" → 4590. */
export function valorDosNumeros(nums: Numero[]): Centavos | null {
  if (!nums.length) return null;
  const [a, b] = nums;
  if (a.emCentavos) return a.valor;
  if (a.centavos) return a.valor;
  let c = a.valor * 100;
  if (b && !b.emCentavos && !b.reais && b.valor < 100 && (b.centavos || !a.centavos)) c += b.valor;
  return c;
}

// ---------------------------------------------------------------------------
// Categorias: palavras-chave conhecidas

const PALAVRAS_CATEGORIA: Record<string, string[]> = {
  Alimentação: [
    'ifood', 'rappi', 'restaurante', 'lanche', 'lanchonete', 'almoco', 'jantar', 'pizza', 'hamburguer',
    'burger', 'padaria', 'cafe', 'cafeteria', 'acai', 'mcdonalds', 'bk', 'sushi', 'bar', 'comida', 'delivery',
  ],
  Mercado: ['mercado', 'supermercado', 'feira', 'hortifruti', 'atacadao', 'assai', 'carrefour', 'pao de acucar', 'acougue'],
  Transporte: [
    'uber', '99', 'taxi', 'onibus', 'metro', 'gasolina', 'combustivel', 'posto', 'estacionamento',
    'pedagio', 'trem', 'bilhete', 'etanol',
  ],
  Lazer: ['cinema', 'show', 'teatro', 'netflix', 'spotify', 'jogo', 'game', 'ingresso', 'festa', 'balada', 'viagem', 'livro'],
  Casa: ['casa', 'limpeza', 'material', 'construcao', 'reforma', 'moveis', 'utensilio', 'leroy', 'tok stok'],
  Saúde: ['farmacia', 'remedio', 'drogaria', 'medico', 'consulta', 'exame', 'dentista', 'droga raia'],
};

const NOMES_PROPRIOS: Record<string, string> = {
  ifood: 'iFood',
  uber: 'Uber',
  rappi: 'Rappi',
  netflix: 'Netflix',
  spotify: 'Spotify',
  mcdonalds: "McDonald's",
  '99': '99',
};

export function categoriaPorPalavra(descricao: string, categorias: Categoria[]): Categoria | undefined {
  const d = normalizar(descricao);
  for (const [nome, palavras] of Object.entries(PALAVRAS_CATEGORIA)) {
    if (palavras.some((p) => new RegExp(`(^|\\s)${p}(\\s|$)`).test(d))) {
      const cat = categorias.find((c) => normalizar(c.nome) === normalizar(nome));
      if (cat) return cat;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Frase completa

export interface Interpretacao {
  valor: Centavos | null;
  descricao: string;
  pagamento: FormaPagamento | null;
  parcelas: number;
  categoriaId: string | null;
}

const VAZIAS = new Set([
  'gastei', 'paguei', 'comprei', 'gasto', 'compra', 'foi', 'deu', 'custou', 'no', 'na', 'nos', 'nas', 'em',
  'de', 'do', 'da', 'dos', 'das', 'com', 'pelo', 'pela', 'pro', 'pra', 'para', 'um', 'uma', 'e', 'o', 'a',
  'r', 'rs', 'reais', 'real', 'centavos', 'centavo', 'conto', 'contos', 'cartao', 'credito', 'debito',
  'pix', 'dinheiro', 'especie', 'vista', 'parcelado', 'parcelada', 'vezes', 'vez', 'x', 'hoje', 'agora',
]);

const PARCELAS_EXTENSO: Record<string, number> = {
  duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12,
};

export function interpretarFrase(
  frase: string,
  ctx: { cartoes: Cartao[]; categorias: Categoria[]; aprendidas: Record<string, string> },
): Interpretacao {
  let texto = normalizar(frase).replace(/r\$\s*/g, ' ');

  // Parcelas: "em 3x", "3 vezes", "em tres vezes", "parcelado em 10"
  let parcelas = 1;
  const mParc =
    texto.match(/(?:em\s+)?(\d{1,2})\s*(?:x\b|vezes)/) ??
    texto.match(/parcelad[oa]\s+em\s+(\d{1,2})/) ??
    texto.match(/(?:em\s+)?(duas|dois|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+vezes/);
  if (mParc) {
    parcelas = Number(mParc[1]) || PARCELAS_EXTENSO[mParc[1]] || 1;
    texto = texto.replace(mParc[0], ' ');
  }

  // Pagamento
  let pagamento: FormaPagamento | null = null;
  const nomesCartoes: string[] = [];
  for (const c of ctx.cartoes) {
    const n = normalizar(c.nome);
    nomesCartoes.push(...n.split(/\s+/));
    if (new RegExp(`(^|\\W)${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`).test(texto)) {
      pagamento = { tipo: 'credito', cartaoId: c.id };
    }
  }
  if (!pagamento) {
    if (/\bpix\b/.test(texto)) pagamento = { tipo: 'pix' };
    else if (/\bdebito\b/.test(texto)) pagamento = { tipo: 'debito' };
    else if (/\b(dinheiro|especie)\b/.test(texto)) pagamento = { tipo: 'dinheiro' };
    else if (/\b(credito|cartao)\b/.test(texto) && ctx.cartoes.length)
      pagamento = { tipo: 'credito', cartaoId: ctx.cartoes[0].id };
  }

  const tokens = texto.match(/\d[\d.,]*\d|\d|[a-z]+/g) ?? [];
  const valor = valorDosNumeros(extrairNumeros(tokens));

  const nomesSet = new Set(nomesCartoes);
  const resto = tokens.filter(
    (t) => !/^\d/.test(t) && !ehPalavraNumero(t) && !VAZIAS.has(t) && !nomesSet.has(t),
  );
  let descricao = resto.join(' ');
  if (NOMES_PROPRIOS[descricao]) descricao = NOMES_PROPRIOS[descricao];
  else if (descricao) descricao = descricao[0].toUpperCase() + descricao.slice(1);

  let categoriaId: string | null = null;
  const chave = normalizar(descricao);
  if (chave && ctx.aprendidas[chave] && ctx.categorias.some((c) => c.id === ctx.aprendidas[chave])) {
    categoriaId = ctx.aprendidas[chave];
  } else {
    categoriaId = categoriaPorPalavra(descricao, ctx.categorias)?.id ?? null;
  }

  return { valor, descricao, pagamento, parcelas, categoriaId };
}
