import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { autenticar } from '../auth/sessao.ts'
import { db } from '../db/client.ts'
import { cartoes, categorias, fixos, gastos, metas, movimentos, perfis, receitas } from '../db/schema.ts'
import { badRequest, parse } from '../lib/http.ts'
import { cdiAtual } from '../services/taxas.ts'
import { dadosDoUsuario, PERFIL_INICIAL } from './conta.ts'

// ---------------------------------------------------------------------------
// Validação: espelha src/store/tipos.ts do app.

const id = z.string().trim().min(1).max(64)
const centavos = z.number().int().min(0).max(1e13)
const dia = z.number().int().min(1).max(31)
const data = z.iso.datetime({ offset: true })
const texto = (max: number) => z.string().trim().max(max)
const mes = z.string().regex(/^\d{4}-\d{2}$/)

const pagamento = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('credito'), cartaoId: id }),
  z.object({ tipo: z.literal('debito') }),
  z.object({ tipo: z.literal('pix') }),
  z.object({ tipo: z.literal('dinheiro') }),
])

const esquemas = {
  categorias: z.object({ nome: texto(60).min(1), limite: centavos }),
  cartoes: z.object({ nome: texto(60).min(1), diaFechamento: dia, diaVencimento: dia, limite: centavos }),
  gastos: z.object({
    descricao: texto(120),
    valor: centavos,
    categoriaId: id,
    pagamento,
    data,
    parcelas: z.number().int().min(1).max(48),
  }),
  fixos: z.object({
    nome: texto(80).min(1),
    tipo: z.enum(['fixo', 'estimado', 'anual']),
    valor: centavos,
    dia,
    mesAnual: z.number().int().min(0).max(11).nullish(),
    lembrete: z.boolean(),
    pagamentos: z.record(mes, centavos).default({}),
  }),
  receitas: z.object({ descricao: texto(120).min(1), valor: centavos, data }),
  metas: z.object({
    nome: texto(80).min(1),
    alvo: centavos,
    aporteMensal: centavos,
    depositos: z.array(z.object({ id, valor: centavos, data })).max(2000).default([]),
    criadaEm: data,
    concluidaEm: data.nullish(),
  }),
  movimentos: z.object({
    conta: z.enum(['caixinha', 'reserva']),
    tipo: z.enum(['guardar', 'resgatar', 'rendimento']),
    valor: centavos,
    data,
    nota: texto(120).nullish(),
  }),
}

const tabelas = { categorias, cartoes, gastos, fixos, receitas, metas, movimentos }
type Colecao = keyof typeof tabelas

const esquemaPerfil = z
  .object({
    onboardingConcluido: z.boolean(),
    renda: z.object({
      valor: centavos,
      diaPagamento: z.discriminatedUnion('tipo', [
        z.object({ tipo: z.literal('dia'), dia }),
        z.object({ tipo: z.literal('ultimo_util') }),
        z.object({ tipo: z.literal('duas_partes'), dias: z.tuple([dia, dia]) }),
      ]),
      variavel: z.boolean(),
    }),
    preferencias: z.object({ lembrarVencimentos: z.boolean(), biometriaAoAbrir: z.boolean() }),
    caixinha: z.object({ percentualCdi: z.number().min(1).max(300), rendimentoAte: mes.optional() }),
    reserva: z.object({ mesesAlvo: z.union([z.literal(3), z.literal(6), z.literal(12)]), aporteMensal: centavos }),
    ajustes: z.record(mes, centavos),
    prejuizosResolvidos: z.record(mes, z.literal(true)),
    aprendidas: z.record(texto(120), id),
    desistencias: z.array(z.object({ item: texto(120), horas: z.number().min(0).max(1e6), data })).max(1000),
    conquistasDatas: z.record(texto(60), data),
  })
  .partial()

const MAX_LOTE = 2000

// ---------------------------------------------------------------------------

/** Linha do banco → formato do app (sem usuarioId, sem nulls). */
function limpar(linha: Record<string, unknown>) {
  const { usuarioId: _, ...resto } = linha
  for (const k of Object.keys(resto)) if (resto[k] == null) delete resto[k]
  return resto
}

/** Datas do banco voltam em formato ISO com "Z", igual o app grava. */
function isoDatas<T extends Record<string, unknown>>(linha: T, campos: string[]): T {
  const r: Record<string, unknown> = { ...linha }
  for (const c of campos) if (typeof r[c] === 'string') r[c] = new Date(r[c] as string).toISOString()
  return r as T
}

export async function estadoDoUsuario(usuarioId: number) {
  const [perfil] = await db.select().from(perfis).where(eq(perfis.usuarioId, usuarioId))
  const p = perfil ?? { ...PERFIL_INICIAL, ajustes: {}, prejuizosResolvidos: {}, aprendidas: {}, desistencias: [], conquistasDatas: {} }
  const [cats, cards, gs, fx, rs, ms, movs] = await Promise.all([
    db.select().from(categorias).where(eq(categorias.usuarioId, usuarioId)),
    db.select().from(cartoes).where(eq(cartoes.usuarioId, usuarioId)),
    db.select().from(gastos).where(eq(gastos.usuarioId, usuarioId)),
    db.select().from(fixos).where(eq(fixos.usuarioId, usuarioId)),
    db.select().from(receitas).where(eq(receitas.usuarioId, usuarioId)),
    db.select().from(metas).where(eq(metas.usuarioId, usuarioId)),
    db.select().from(movimentos).where(eq(movimentos.usuarioId, usuarioId)),
  ])
  const mov = (conta: string) =>
    movs
      .filter((m) => m.conta === conta)
      .map((m) => {
        const { conta: _, ...resto } = limpar(isoDatas(m, ['data']))
        return resto
      })
  const caixinha = p.caixinha as { percentualCdi: number; rendimentoAte?: string }
  const reserva = p.reserva as { mesesAlvo: number; aporteMensal: number }
  return {
    onboardingConcluido: p.onboardingConcluido,
    renda: p.renda,
    preferencias: p.preferencias,
    ajustes: p.ajustes,
    prejuizosResolvidos: p.prejuizosResolvidos,
    aprendidas: p.aprendidas,
    desistencias: p.desistencias,
    conquistasDatas: p.conquistasDatas,
    categorias: cats.map(limpar),
    cartoes: cards.map(limpar),
    gastos: gs.map((g) => limpar(isoDatas(g, ['data']))),
    fixos: fx.map(limpar),
    receitas: rs.map((r) => limpar(isoDatas(r, ['data']))),
    metas: ms.map((m) => limpar(isoDatas(m, ['criadaEm', 'concluidaEm']))),
    caixinha: { ...caixinha, movimentos: mov('caixinha') },
    reserva: { ...reserva, movimentos: mov('reserva') },
    taxas: await cdiAtual(),
  }
}

async function salvar(colecao: Colecao, usuarioId: number, itens: { id: string; dados: Record<string, unknown> }[]) {
  if (!itens.length) return
  const tabela = tabelas[colecao]
  const linhas = itens.map(({ id, dados }) => ({ ...dados, id, usuarioId }))
  const colunas = Object.keys(esquemas[colecao].shape)
  const set = Object.fromEntries(colunas.map((c) => [c, (tabela as unknown as Record<string, unknown>)[c]]))
  // "excluded" = valores da linha que tentou entrar; atualiza tudo menos a chave.
  await db
    .insert(tabela)
    .values(linhas as never)
    .onConflictDoUpdate({
      target: [tabela.usuarioId, tabela.id],
      set: Object.fromEntries(Object.entries(set).map(([k, col]) => [k, sql.raw(`excluded.${(col as { name: string }).name}`)])),
    })
}

export async function rotasDados(app: FastifyInstance) {
  app.addHook('preHandler', autenticar)

  app.get('/api/estado', async (req) => ({ usuario: dadosDoUsuario(req.usuario), ...(await estadoDoUsuario(req.usuario.id)) }))

  app.patch('/api/perfil', async (req) => {
    const p = parse(esquemaPerfil, req.body)
    if (!Object.keys(p).length) throw badRequest('Nada para salvar.')
    await db
      .insert(perfis)
      .values({ usuarioId: req.usuario.id, ...PERFIL_INICIAL, ...p })
      .onConflictDoUpdate({ target: perfis.usuarioId, set: p })
    return { ok: true }
  })

  for (const colecao of Object.keys(tabelas) as Colecao[]) {
    const esquema = esquemas[colecao]
    const tabela = tabelas[colecao]

    app.put<{ Params: { id: string } }>(`/api/${colecao}/:id`, async (req) => {
      const chave = parse(id, req.params.id)
      await salvar(colecao, req.usuario.id, [{ id: chave, dados: parse(esquema, req.body) }])
      return { ok: true }
    })

    // Vários de uma vez: onboarding, importação de extrato, recategorizar gastos.
    app.post(`/api/${colecao}/lote`, async (req) => {
      const lista = parse(z.array(z.object({ id }).loose()).max(MAX_LOTE), req.body)
      await salvar(
        colecao,
        req.usuario.id,
        lista.map((item) => ({ id: item.id, dados: parse(esquema, item) })),
      )
      return { ok: true, total: lista.length }
    })

    app.delete<{ Params: { id: string } }>(`/api/${colecao}/:id`, async (req) => {
      await db.delete(tabela).where(and(eq(tabela.usuarioId, req.usuario.id), eq(tabela.id, parse(id, req.params.id))))
      return { ok: true }
    })
  }

  // Apaga só os dados financeiros (a conta continua).
  app.delete('/api/dados', async (req) => {
    for (const t of Object.values(tabelas)) await db.delete(t).where(eq(t.usuarioId, req.usuario.id))
    await db.update(perfis).set({ ...PERFIL_INICIAL, ajustes: {}, prejuizosResolvidos: {}, aprendidas: {}, desistencias: [], conquistasDatas: {} }).where(eq(perfis.usuarioId, req.usuario.id))
    return { ok: true }
  })
}
