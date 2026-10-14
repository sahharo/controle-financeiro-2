import type { Centavos } from '@/lib/dinheiro';
import type { ChaveMes } from '@/lib/datas';

export type DiaPagamento =
  | { tipo: 'dia'; dia: number }
  | { tipo: 'ultimo_util' }
  | { tipo: 'duas_partes'; dias: [number, number] };

export interface Usuario {
  nome: string;
  sobrenome: string;
  cpf: string;
  celular: string;
  email: string;
  criadoEm: string;
}

export interface Renda {
  valor: Centavos;
  diaPagamento: DiaPagamento;
  variavel: boolean;
}

export interface Categoria {
  id: string;
  nome: string;
  limite: Centavos;
}

export interface Cartao {
  id: string;
  nome: string;
  diaFechamento: number;
  diaVencimento: number;
  limite: Centavos;
}

export type FormaPagamento =
  | { tipo: 'credito'; cartaoId: string }
  | { tipo: 'debito' }
  | { tipo: 'pix' }
  | { tipo: 'dinheiro' };

export interface Gasto {
  id: string;
  descricao: string;
  /** Valor total da compra. Parcelado: dividido em `parcelas` meses. */
  valor: Centavos;
  categoriaId: string;
  pagamento: FormaPagamento;
  data: string;
  parcelas: number;
}

export type TipoFixo = 'fixo' | 'estimado' | 'anual';

export interface Fixo {
  id: string;
  nome: string;
  tipo: TipoFixo;
  /** fixo: valor mensal; estimado: valor de referência; anual: valor total do ano. */
  valor: Centavos;
  /** Dia do vencimento no mês. */
  dia: number;
  /** Só para anuais: mês do pagamento (0 = janeiro). */
  mesAnual?: number;
  lembrete: boolean;
  /** Valores efetivamente pagos por mês. */
  pagamentos: Record<ChaveMes, Centavos>;
}

export interface Receita {
  id: string;
  descricao: string;
  valor: Centavos;
  data: string;
}

export interface Deposito {
  id: string;
  valor: Centavos;
  data: string;
}

export interface Meta {
  id: string;
  nome: string;
  alvo: Centavos;
  aporteMensal: Centavos;
  depositos: Deposito[];
  criadaEm: string;
  concluidaEm?: string;
}

export type TipoMovimento = 'guardar' | 'resgatar' | 'rendimento';

export interface Movimento {
  id: string;
  tipo: TipoMovimento;
  valor: Centavos;
  data: string;
  nota?: string;
}

export interface Caixinha {
  /** Percentual do CDI que a aplicação rende (100 = 100% do CDI). */
  percentualCdi: number;
  movimentos: Movimento[];
  /** Último mês fechado cujo rendimento já foi lançado. */
  rendimentoAte?: ChaveMes;
}

export interface Reserva {
  mesesAlvo: 3 | 6 | 12;
  aporteMensal: Centavos;
  movimentos: Movimento[];
}

export interface Taxas {
  /** CDI anualizado em % (ex.: 10.4). */
  cdiAnual: number;
  atualizadoEm?: string;
}

export interface Preferencias {
  lembrarVencimentos: boolean;
  biometriaAoAbrir: boolean;
}
