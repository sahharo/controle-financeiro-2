import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, lt, ne } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { db } from '../db/client.ts'
import { sessoes, usuarios } from '../db/schema.ts'
import { env } from '../env.ts'
import { unauthorized } from '../lib/http.ts'

export const COOKIE_SESSAO = 'sobra_sessao'
export const DURACAO_SESSAO_MS = 60 * 24 * 60 * 60 * 1000
const RENOVAR_ANTES_MS = 30 * 24 * 60 * 60 * 1000

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function criarSessao(usuarioId: number, userAgent?: string) {
  const token = randomBytes(32).toString('base64url')
  await db.insert(sessoes).values({
    id: hashToken(token),
    usuarioId,
    userAgent: userAgent?.slice(0, 300),
    expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
  })
  return token
}

/** Id do usuário de uma sessão válida; renova as que estão perto de vencer. */
export async function resolverSessao(token: string) {
  const id = hashToken(token)
  const [s] = await db.select().from(sessoes).where(and(eq(sessoes.id, id), gt(sessoes.expiraEm, new Date())))
  if (!s) return null
  if (s.expiraEm.getTime() - Date.now() < RENOVAR_ANTES_MS)
    await db.update(sessoes).set({ expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS) }).where(eq(sessoes.id, id))
  return s.usuarioId
}

export const encerrarSessao = (token: string) => db.delete(sessoes).where(eq(sessoes.id, hashToken(token)))

export const encerrarSessoesDoUsuario = (usuarioId: number, excetoToken?: string) =>
  db
    .delete(sessoes)
    .where(excetoToken ? and(eq(sessoes.usuarioId, usuarioId), ne(sessoes.id, hashToken(excetoToken))) : eq(sessoes.usuarioId, usuarioId))

export const limparSessoesVencidas = () => db.delete(sessoes).where(lt(sessoes.expiraEm, new Date()))

/**
 * O site usa cookie HttpOnly; o app de celular guarda o token no chaveiro do aparelho
 * e o envia em "Authorization: Bearer".
 */
export function tokenDaRequisicao(req: FastifyRequest): string | undefined {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || undefined
  return req.cookies[COOKIE_SESSAO]
}

export function gravarCookie(reply: FastifyReply, token: string) {
  reply.setCookie(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/',
    maxAge: DURACAO_SESSAO_MS / 1000,
  })
}

export type Usuario = typeof usuarios.$inferSelect

declare module 'fastify' {
  interface FastifyRequest {
    usuario: Usuario
  }
}

export async function autenticar(req: FastifyRequest, _reply: FastifyReply) {
  const token = tokenDaRequisicao(req)
  const id = token ? await resolverSessao(token) : null
  const [usuario] = id ? await db.select().from(usuarios).where(eq(usuarios.id, id)) : []
  if (!usuario) throw unauthorized()
  req.usuario = usuario
}
