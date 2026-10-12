import { lerValor, type Centavos } from './dinheiro';
import { normalizar } from './interpretar';

export interface Lancamento {
  data: string;
  descricao: string;
  /** Sempre positivo: valor do gasto. */
  valor: Centavos;
}

function dataOfx(s: string): string | null {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 12), Number(m[5] ?? 0)).toISOString();
}

function tagOfx(bloco: string, tag: string): string | null {
  const m = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'));
  return m ? m[1].trim() : null;
}

/** Lê extratos/faturas OFX. Só os débitos (valores negativos) viram gastos. */
export function lerOfx(texto: string): Lancamento[] {
  const r: Lancamento[] = [];
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  for (const b of blocos) {
    const valorTxt = tagOfx(b, 'TRNAMT');
    const dataTxt = tagOfx(b, 'DTPOSTED');
    if (!valorTxt || !dataTxt) continue;
    const n = Number(valorTxt.replace(',', '.'));
    const data = dataOfx(dataTxt);
    if (!Number.isFinite(n) || n >= 0 || !data) continue;
    const descricao = tagOfx(b, 'MEMO') || tagOfx(b, 'NAME') || 'Gasto importado';
    r.push({ data, descricao, valor: Math.round(Math.abs(n) * 100) });
  }
  return r;
}

function dividirLinhaCsv(linha: string, sep: string): string[] {
  const r: string[] = [];
  let atual = '';
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else aspas = !aspas;
    } else if (ch === sep && !aspas) {
      r.push(atual.trim());
      atual = '';
    } else atual += ch;
  }
  r.push(atual.trim());
  return r;
}

function dataCsv(s: string): string | null {
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const ano = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    return new Date(ano, Number(m[2]) - 1, Number(m[1]), 12).toISOString();
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).toISOString();
  return null;
}

function valorCsv(s: string): number | null {
  const negativo = /^\s*-|^\s*\(|−/.test(s);
  const c = lerValor(s);
  if (c == null) return null;
  return negativo ? -c : c;
}

/**
 * Lê CSV de bancos e cartões (Nubank, Inter etc.). Procura colunas de data,
 * descrição e valor pelo cabeçalho. Se todos os valores forem positivos
 * (fatura de cartão), todos viram gastos; senão, só os negativos.
 */
export function lerCsv(texto: string): Lancamento[] {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];
  const sep = (linhas[0].match(/;/g) ?? []).length > (linhas[0].match(/,/g) ?? []).length ? ';' : ',';
  const cab = dividirLinhaCsv(linhas[0], sep).map(normalizar);
  const idx = (re: RegExp) => cab.findIndex((c) => re.test(c));
  const iData = idx(/^data|date/);
  const iDesc = idx(/descri|historico|title|titulo|memo|estabelecimento|lancamento/);
  const iValor = idx(/valor|amount|quantia/);
  if (iData < 0 || iValor < 0) return [];

  const brutos: { data: string; descricao: string; valor: number }[] = [];
  for (const linha of linhas.slice(1)) {
    const cols = dividirLinhaCsv(linha, sep);
    const data = dataCsv(cols[iData] ?? '');
    const valor = valorCsv(cols[iValor] ?? '');
    if (!data || valor == null || valor === 0) continue;
    brutos.push({ data, descricao: (iDesc >= 0 ? cols[iDesc] : '') || 'Gasto importado', valor });
  }
  const todosPositivos = brutos.every((b) => b.valor > 0);
  return brutos
    .filter((b) => (todosPositivos ? true : b.valor < 0))
    .map((b) => ({ ...b, valor: Math.abs(b.valor) }));
}

export function lerArquivo(nome: string, texto: string): Lancamento[] {
  if (/\.ofx$/i.test(nome) || /<OFX>/i.test(texto)) return lerOfx(texto);
  return lerCsv(texto);
}

function celula(v: string | number): string {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCsv(cabecalho: string[], linhas: (string | number)[][]): string {
  return [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\n');
}
