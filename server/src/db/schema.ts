import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core'

// Valores em dinheiro são sempre centavos (inteiros). Os ids das coisas que a pessoa cria
// (gastos, metas...) são gerados no app, para a tela atualizar antes da resposta da API.
const centavos = (nome: string) => bigint(nome, { mode: 'number' }).notNull()
const dono = () =>
  integer('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' })
const quando = (nome: string) => timestamp(nome, { withTimezone: true, mode: 'string' }).notNull()

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  sobrenome: text('sobrenome').notNull(),
  cpf: text('cpf').notNull().unique(),
  celular: text('celular').notNull(),
  email: text('email').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export const sessoes = pgTable(
  'sessoes',
  {
    id: text('id').primaryKey(),
    usuarioId: dono(),
    userAgent: text('user_agent'),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  },
  (t) => [index('sessoes_usuario_idx').on(t.usuarioId)],
)

export const redefinicoesSenha = pgTable('redefinicoes_senha', {
  id: text('id').primaryKey(),
  usuarioId: dono(),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  usadoEm: timestamp('usado_em', { withTimezone: true }),
})

/** Configurações e dados "de uma linha só" de cada pessoa. */
export const perfis = pgTable('perfis', {
  usuarioId: dono().primaryKey(),
  onboardingConcluido: boolean('onboarding_concluido').notNull().default(false),
  renda: jsonb('renda').notNull(),
  preferencias: jsonb('preferencias').notNull(),
  caixinha: jsonb('caixinha').notNull(),
  reserva: jsonb('reserva').notNull(),
  ajustes: jsonb('ajustes').notNull().default({}),
  prejuizosResolvidos: jsonb('prejuizos_resolvidos').notNull().default({}),
  aprendidas: jsonb('aprendidas').notNull().default({}),
  desistencias: jsonb('desistencias').notNull().default([]),
  conquistasDatas: jsonb('conquistas_datas').notNull().default({}),
})

export const categorias = pgTable(
  'categorias',
  { id: text('id').notNull(), usuarioId: dono(), nome: text('nome').notNull(), limite: centavos('limite') },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] })],
)

export const cartoes = pgTable(
  'cartoes',
  {
    id: text('id').notNull(),
    usuarioId: dono(),
    nome: text('nome').notNull(),
    diaFechamento: integer('dia_fechamento').notNull(),
    diaVencimento: integer('dia_vencimento').notNull(),
    limite: centavos('limite'),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] })],
)

export const gastos = pgTable(
  'gastos',
  {
    id: text('id').notNull(),
    usuarioId: dono(),
    descricao: text('descricao').notNull(),
    valor: centavos('valor'),
    categoriaId: text('categoria_id').notNull(),
    pagamento: jsonb('pagamento').notNull(),
    data: quando('data'),
    parcelas: integer('parcelas').notNull(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] }), index('gastos_data_idx').on(t.usuarioId, t.data)],
)

export const fixos = pgTable(
  'fixos',
  {
    id: text('id').notNull(),
    usuarioId: dono(),
    nome: text('nome').notNull(),
    tipo: text('tipo').notNull(),
    valor: centavos('valor'),
    dia: integer('dia').notNull(),
    mesAnual: integer('mes_anual'),
    lembrete: boolean('lembrete').notNull(),
    pagamentos: jsonb('pagamentos').notNull().default({}),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] })],
)

export const receitas = pgTable(
  'receitas',
  { id: text('id').notNull(), usuarioId: dono(), descricao: text('descricao').notNull(), valor: centavos('valor'), data: quando('data') },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] })],
)

export const metas = pgTable(
  'metas',
  {
    id: text('id').notNull(),
    usuarioId: dono(),
    nome: text('nome').notNull(),
    alvo: centavos('alvo'),
    aporteMensal: centavos('aporte_mensal'),
    depositos: jsonb('depositos').notNull().default([]),
    criadaEm: quando('criada_em'),
    concluidaEm: timestamp('concluida_em', { withTimezone: true, mode: 'string' }),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] })],
)

/** Movimentos da caixinha e da reserva de emergência. */
export const movimentos = pgTable(
  'movimentos',
  {
    id: text('id').notNull(),
    usuarioId: dono(),
    conta: text('conta').notNull(),
    tipo: text('tipo').notNull(),
    valor: centavos('valor'),
    data: quando('data'),
    nota: text('nota'),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.id] })],
)

/** Valores globais, como o CDI do dia. */
export const taxas = pgTable('taxas', {
  chave: text('chave').primaryKey(),
  valor: jsonb('valor').notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
})
