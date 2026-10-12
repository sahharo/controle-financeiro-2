import type { Cartao, Categoria, FormaPagamento } from '@/store/tipos';

export function rotuloPagamento(p: FormaPagamento, cartoes: Cartao[], detalhado = false): string {
  switch (p.tipo) {
    case 'credito': {
      const nome = cartoes.find((c) => c.id === p.cartaoId)?.nome ?? 'Cartão';
      return detalhado ? `${nome} · crédito` : nome;
    }
    case 'debito':
      return 'Débito';
    case 'pix':
      return 'Pix';
    case 'dinheiro':
      return 'Dinheiro';
  }
}

export function nomeCategoria(id: string, categorias: Categoria[]): string {
  return categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria';
}
