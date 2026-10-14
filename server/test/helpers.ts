import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { criarApp } from '../src/app.ts'
import { db } from '../src/db/client.ts'
import { runMigrations } from '../src/db/migrate.ts'

export async function preparar() {
  await runMigrations()
  await db.execute(sql`truncate table usuarios, taxas restart identity cascade`)
  return criarApp()
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Cliente mínimo sobre fastify.inject, que guarda o cookie de sessão (como o site). */
export class Cliente {
  cookie = ''
  constructor(private app: FastifyInstance) {}

  async req(method: Metodo, url: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await this.app.inject({
      method,
      url,
      payload: body as object | undefined,
      headers: { cookie: this.cookie, 'x-requested-with': 'sobra', ...headers },
    })
    const c = res.cookies.find((x) => x.name === 'sobra_sessao')
    if (c) this.cookie = c.value ? `sobra_sessao=${c.value}` : ''
    return { status: res.statusCode, body: res.body ? res.json() : null }
  }
  get = (url: string) => this.req('GET', url)
  post = (url: string, body: unknown = {}) => this.req('POST', url, body)
  put = (url: string, body: unknown) => this.req('PUT', url, body)
  patch = (url: string, body: unknown) => this.req('PATCH', url, body)
  del = (url: string) => this.req('DELETE', url)
}

let seq = 0
/** CPF válido e e-mail únicos para cada pessoa de teste. */
export function pessoa(extra: Record<string, unknown> = {}) {
  seq++
  const d = String(100000000 + seq * 7919).slice(0, 9).split('').map(Number)
  const dv = (arr: number[]) => {
    const r = (arr.reduce((acc, n, i) => acc + n * (arr.length + 1 - i), 0) * 10) % 11
    return r === 10 ? 0 : r
  }
  const d1 = dv(d)
  const cpf = [...d, d1, dv([...d, d1])].join('')
  return {
    nome: 'Marina',
    sobrenome: 'Costa',
    cpf,
    celular: '(11) 91234-5678',
    email: `pessoa${seq}@email.com`,
    senha: 'Sobra2026!',
    aceite: true,
    ...extra,
  }
}
