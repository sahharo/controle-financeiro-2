import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyError } from 'fastify'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { env } from './env.ts'
import { forbidden, HttpError } from './lib/http.ts'
import { rotasConta } from './routes/conta.ts'
import { rotasDados } from './routes/dados.ts'

// O site (versão web do app, gerada pelo Expo em /dist) é servido pela própria API.
const siteDist = fileURLToPath(new URL('../../dist', import.meta.url))
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function criarApp({ logger = !env.isTest } = {}) {
  const app = Fastify({ logger, trustProxy: true, bodyLimit: 2_000_000 })

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
  await app.register(cookie)
  // Só no computador de quem desenvolve: o site do Expo (porta 8081) chama a API local (3333).
  // Publicado, o site e a API ficam no mesmo endereço e não há CORS.
  if (env.isLocal && !env.isTest)
    await app.register(cors, { origin: ['http://localhost:8081', 'http://127.0.0.1:8081'], credentials: true })
  await app.register(rateLimit, { max: env.isTest ? 10_000 : 300, timeWindow: '1 minute' })

  // Proteção contra CSRF: chamadas que mudam dados precisam de um cabeçalho próprio, que o navegador
  // só deixa outro site mandar depois de um preflight de CORS (e esta API não habilita CORS).
  app.addHook('onRequest', async (req) => {
    if (req.url.startsWith('/api/') && !METODOS_SEGUROS.has(req.method) && req.headers['x-requested-with'] !== 'sobra')
      throw forbidden('Requisição bloqueada.')
  })

  app.setErrorHandler((err: FastifyError & { code?: string }, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.statusCode).send({ error: err.code, message: err.message, details: err.details })
    if (err.statusCode === 429) return reply.status(429).send({ error: 'rate_limited', message: 'Muitas tentativas. Aguarde um minuto.' })
    if (err.code === '23505') return reply.status(409).send({ error: 'conflict', message: 'Registro duplicado.' })
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ error: 'bad_request', message: 'Requisição inválida.' })
    req.log.error(err)
    return reply.status(500).send({ error: 'internal', message: 'Erro interno. Tente novamente.' })
  })

  app.get('/api/saude', async () => ({ ok: true }))
  await app.register(rotasConta)
  await app.register(rotasDados)

  if (existsSync(siteDist) && !env.isTest) {
    await app.register(fastifyStatic, { root: siteDist, wildcard: false })
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith('/api/') ? reply.status(404).send({ error: 'not_found', message: 'Rota não encontrada.' }) : reply.sendFile('index.html'),
    )
  }
  return app
}
