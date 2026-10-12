import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { fmt } from './dinheiro';
import { gerarCsv, lerArquivo, type Lancamento } from './importacao';
import { nomeCategoria, rotuloPagamento } from './rotulos';
import type { Estado } from '@/store';

/** Abre o seletor de arquivos e lê um extrato/fatura CSV ou OFX. null = cancelado. */
export async function escolherExtrato(): Promise<Lancamento[] | null> {
  const r = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/x-ofx', 'application/ofx', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.length) return null;
  const asset = r.assets[0];
  const texto = await new File(asset.uri).text();
  return lerArquivo(asset.name, texto);
}

function data(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Gera um CSV com gastos, fixos, entradas e o que foi guardado, e abre o compartilhamento. */
export async function exportarDados(s: Estado): Promise<void> {
  const linhas: (string | number)[][] = [];
  for (const g of [...s.gastos].sort((a, b) => a.data.localeCompare(b.data)))
    linhas.push([
      data(g.data),
      'gasto',
      g.descricao,
      nomeCategoria(g.categoriaId, s.categorias),
      rotuloPagamento(g.pagamento, s.cartoes, true),
      g.parcelas,
      `-${fmt(g.valor)}`,
    ]);
  for (const f of s.fixos)
    for (const [mes, valor] of Object.entries(f.pagamentos))
      linhas.push([`${String(f.dia).padStart(2, '0')}/${mes.slice(5)}/${mes.slice(0, 4)}`, 'fixo', f.nome, '', '', 1, `-${fmt(valor)}`]);
  for (const r of s.receitas) linhas.push([data(r.data), 'entrada', r.descricao, '', '', 1, fmt(r.valor)]);
  for (const m of s.metas) for (const d of m.depositos) linhas.push([data(d.data), 'meta', m.nome, '', '', 1, fmt(d.valor)]);
  for (const m of s.caixinha.movimentos)
    linhas.push([data(m.data), `caixinha:${m.tipo}`, m.nota ?? '', '', '', 1, `${m.tipo === 'resgatar' ? '-' : ''}${fmt(m.valor)}`]);
  for (const m of s.reserva.movimentos)
    linhas.push([data(m.data), `reserva:${m.tipo}`, '', '', '', 1, `${m.tipo === 'resgatar' ? '-' : ''}${fmt(m.valor)}`]);

  const csv = gerarCsv(['data', 'tipo', 'descricao', 'categoria', 'pagamento', 'parcelas', 'valor'], linhas);
  const arquivo = new File(Paths.cache, `sobra-dados-${new Date().toISOString().slice(0, 10)}.csv`);
  if (arquivo.exists) arquivo.delete();
  arquivo.create();
  arquivo.write('﻿' + csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(arquivo.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar meus dados', UTI: 'public.comma-separated-values-text' });
  }
}
