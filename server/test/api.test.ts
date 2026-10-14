import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/db/client.ts'
import { sentMails } from '../src/lib/mail.ts'
import { Cliente, pessoa, preparar } from './helpers.ts'

let app: FastifyInstance

beforeAll(async () => {
  app = await preparar()
})
afterAll(async () => {
  await app.close()
  await pool.end()
})

async function novaConta(extra: Record<string, unknown> = {}) {
  const c = new Cliente(app)
  const dados = pessoa(extra)
  const r = await c.post('/api/conta/cadastro', dados)
  expect(r.status).toBe(201)
  return { c, dados }
}

const gasto = {
  descricao: 'iFood',
  valor: 4590,
  categoriaId: 'ali',
  pagamento: { tipo: 'credito', cartaoId: 'nu' },
  data: '2026-10-12T23:14:00.000Z',
  parcelas: 1,
}

describe('conta', () => {
  it('cadastra, entra por e-mail ou CPF e sai', async () => {
    const { c, dados } = await novaConta()
    expect((await c.get('/api/conta')).body.usuario).toMatchObject({ nome: 'Marina', email: dados.email })

    expect((await c.post('/api/conta/sair')).status).toBe(200)
    expect((await c.get('/api/conta')).status).toBe(401)

    const outro = new Cliente(app)
    expect((await outro.post('/api/conta/entrar', { identificador: dados.email.toUpperCase(), senha: dados.senha })).status).toBe(200)
    const porCpf = new Cliente(app)
    const cpfComMascara = dados.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    expect((await porCpf.post('/api/conta/entrar', { identificador: cpfComMascara, senha: dados.senha })).status).toBe(200)
    expect((await porCpf.post('/api/conta/entrar', { identificador: dados.email, senha: 'errada' })).status).toBe(401)
  })

  it('recusa e-mail ou CPF repetido, CPF inválido e senha fraca', async () => {
    const { dados } = await novaConta()
    const c = new Cliente(app)
    expect((await c.post('/api/conta/cadastro', pessoa({ email: dados.email }))).status).toBe(409)
    expect((await c.post('/api/conta/cadastro', pessoa({ cpf: dados.cpf }))).status).toBe(409)
    expect((await c.post('/api/conta/cadastro', pessoa({ cpf: '111.111.111-11' }))).body.message).toBe('CPF inválido.')
    expect((await c.post('/api/conta/cadastro', pessoa({ senha: 'fraca' }))).status).toBe(400)
  })

  it('o app de celular recebe o token e usa Authorization: Bearer', async () => {
    const dados = pessoa()
    const r = await app.inject({
      method: 'POST',
      url: '/api/conta/cadastro',
      payload: dados,
      headers: { 'x-requested-with': 'sobra', 'x-cliente': 'app' },
    })
    const { token } = r.json()
    expect(token).toBeTruthy()
    const eu = await app.inject({ method: 'GET', url: '/api/conta', headers: { authorization: `Bearer ${token}` } })
    expect(eu.statusCode).toBe(200)
    // O site não recebe o token no corpo, só o cookie HttpOnly.
    const login = await new Cliente(app).post('/api/conta/entrar', { identificador: dados.email, senha: dados.senha })
    expect(login.status).toBe(200)
    expect(login.body.token).toBeUndefined()
  })

  it('bloqueia mudanças sem o cabeçalho anti-CSRF', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/conta/entrar', payload: { identificador: 'a@b.com', senha: 'x' } })
    expect(r.statusCode).toBe(403)
  })

  it('redefine a senha pelo link do e-mail e derruba as sessões', async () => {
    const { c, dados } = await novaConta()
    sentMails.length = 0
    expect((await new Cliente(app).post('/api/conta/esqueci', { email: dados.email })).status).toBe(200)
    expect((await new Cliente(app).post('/api/conta/esqueci', { email: 'ninguem@email.com' })).status).toBe(200)
    expect(sentMails).toHaveLength(1)
    const token = sentMails[0].text.match(/token=([\w-]+)/)![1]
    const r = await new Cliente(app).post('/api/conta/redefinir', { token, senha: 'NovaSenha#1' })
    expect(r.status).toBe(200)
    expect((await c.get('/api/conta')).status).toBe(401)
    expect((await new Cliente(app).post('/api/conta/redefinir', { token, senha: 'OutraSenha#2' })).status).toBe(400)
    const entrar = await new Cliente(app).post('/api/conta/entrar', { identificador: dados.email, senha: 'NovaSenha#1' })
    expect(entrar.status).toBe(200)
  })
})

describe('dados', () => {
  it('começa vazio, salva perfil e itens e devolve tudo em /api/estado', async () => {
    const { c } = await novaConta()
    let e = (await c.get('/api/estado')).body
    expect(e).toMatchObject({ onboardingConcluido: false, gastos: [], taxas: { cdiAnual: 14.9 } })

    expect(
      (await c.patch('/api/perfil', { onboardingConcluido: true, renda: { valor: 620000, diaPagamento: { tipo: 'dia', dia: 5 }, variavel: false } })).status,
    ).toBe(200)
    expect((await c.put('/api/categorias/ali', { nome: 'Alimentação', limite: 80000 })).status).toBe(200)
    expect((await c.put('/api/gastos/g1', gasto)).status).toBe(200)
    expect((await c.put('/api/gastos/g1', { ...gasto, valor: 5000 })).status).toBe(200)
    expect((await c.put('/api/movimentos/m1', { conta: 'caixinha', tipo: 'guardar', valor: 30000, data: gasto.data })).status).toBe(200)
    expect(
      (await c.put('/api/metas/meta1', { nome: 'Viagem', alvo: 450000, aporteMensal: 40000, criadaEm: gasto.data, depositos: [{ id: 'd1', valor: 1000, data: gasto.data }] })).status,
    ).toBe(200)

    e = (await c.get('/api/estado')).body
    expect(e.onboardingConcluido).toBe(true)
    expect(e.renda.valor).toBe(620000)
    expect(e.gastos).toEqual([{ id: 'g1', ...gasto, valor: 5000 }])
    expect(e.caixinha).toEqual({ percentualCdi: 100, movimentos: [{ id: 'm1', tipo: 'guardar', valor: 30000, data: gasto.data }] })
    expect(e.metas[0].depositos).toHaveLength(1)
  })

  it('valida os dados recebidos', async () => {
    const { c } = await novaConta()
    expect((await c.put('/api/gastos/g1', { ...gasto, valor: -1 })).status).toBe(400)
    expect((await c.put('/api/gastos/g1', { ...gasto, pagamento: { tipo: 'cheque' } })).status).toBe(400)
    expect((await c.patch('/api/perfil', { reserva: { mesesAlvo: 5, aporteMensal: 0 } })).status).toBe(400)
  })

  it('salva em lote e apaga', async () => {
    const { c } = await novaConta()
    const lote = Array.from({ length: 50 }, (_, i) => ({ id: `g${i}`, ...gasto, valor: 100 + i }))
    expect((await c.post('/api/gastos/lote', lote)).body.total).toBe(50)
    expect((await c.del('/api/gastos/g0')).status).toBe(200)
    expect((await c.get('/api/estado')).body.gastos).toHaveLength(49)
  })

  it('uma conta nunca vê nem mexe nos dados de outra', async () => {
    const a = await novaConta()
    const b = await novaConta()
    await a.c.put('/api/gastos/igual', gasto)
    // Mesmo id em outra conta é outro registro.
    await b.c.put('/api/gastos/igual', { ...gasto, valor: 1 })
    await b.c.del('/api/gastos/igual')
    const ea = (await a.c.get('/api/estado')).body
    expect(ea.gastos).toEqual([{ id: 'igual', ...gasto }])
    expect((await b.c.get('/api/estado')).body.gastos).toEqual([])
    expect((await new Cliente(app).get('/api/estado')).status).toBe(401)
  })

  it('excluir a conta apaga tudo', async () => {
    const { c, dados } = await novaConta()
    await c.put('/api/gastos/g1', gasto)
    expect((await c.del('/api/conta')).status).toBe(200)
    expect((await c.get('/api/estado')).status).toBe(401)
    const r = await new Cliente(app).post('/api/conta/entrar', { identificador: dados.email, senha: dados.senha })
    expect(r.status).toBe(401)
    const { rows } = await pool.query("select count(*)::int as n from gastos g join usuarios u on u.id = g.usuario_id where u.email = $1", [dados.email])
    expect(rows[0].n).toBe(0)
    const { rows: orfaos } = await pool.query("select count(*)::int as n from gastos where usuario_id not in (select id from usuarios)")
    expect(orfaos[0].n).toBe(0)
  })
})
