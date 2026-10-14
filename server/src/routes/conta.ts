import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { celularValido, cpfValido, emailValido, regrasSenha, soDigitos } from '../../../shared/validacao.ts'
import { hashPassword, verifyPassword } from '../auth/senha.ts'
import {
  autenticar,
  criarSessao,
  encerrarSessao,
  encerrarSessoesDoUsuario,
  gravarCookie,
  hashToken,
  tokenDaRequisicao,
  COOKIE_SESSAO,
  type Usuario,
} from '../auth/sessao.ts'
import { db } from '../db/client.ts'
import { perfis, redefinicoesSenha, usuarios } from '../db/schema.ts'
import { env } from '../env.ts'
import { badRequest, conflict, HttpError, parse } from '../lib/http.ts'
import { sendMail } from '../lib/mail.ts'

const ERRO_SENHA = 'A senha precisa de 8 caracteres ou mais, uma letra maiúscula, um número e um caractere especial.'
const campoSenha = z.string().max(200).refine((s) => regrasSenha(s).every((r) => r.ok), ERRO_SENHA)
const campoEmail = z.string().trim().toLowerCase().refine(emailValido, 'E-mail inválido.')

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(60),
  sobrenome: z.string().trim().min(2, 'Informe o sobrenome.').max(80),
  cpf: z.string().transform(soDigitos).refine(cpfValido, 'CPF inválido.'),
  celular: z.string().transform(soDigitos).refine(celularValido, 'Celular inválido.'),
  email: campoEmail,
  senha: campoSenha,
  aceite: z.literal(true, 'É preciso aceitar os termos de uso e a política de privacidade.'),
})

const esquemaEntrar = z.object({
  identificador: z.string().trim().min(3, 'Informe seu e-mail ou CPF.').max(254),
  senha: z.string().min(1, 'Informe a senha.').max(200),
})

export const PERFIL_INICIAL = {
  onboardingConcluido: false,
  renda: { valor: 0, diaPagamento: { tipo: 'dia', dia: 5 }, variavel: false },
  preferencias: { lembrarVencimentos: true, biometriaAoAbrir: false },
  caixinha: { percentualCdi: 100 },
  reserva: { mesesAlvo: 6, aporteMensal: 0 },
}

export function dadosDoUsuario(u: Usuario) {
  return {
    nome: u.nome,
    sobrenome: u.sobrenome,
    cpf: u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    celular: u.celular,
    email: u.email,
    criadoEm: u.criadoEm.toISOString(),
  }
}

/** O app de celular pede o token no corpo (guarda no chaveiro); o site fica só com o cookie. */
async function abrirSessao(req: FastifyRequest, reply: FastifyReply, u: Usuario) {
  const token = await criarSessao(u.id, req.headers['user-agent'])
  gravarCookie(reply, token)
  return { usuario: dadosDoUsuario(u), ...(req.headers['x-cliente'] === 'app' ? { token } : {}) }
}

const limiteLogin = { rateLimit: { max: env.isTest ? 1000 : 10, timeWindow: '1 minute' } }
const limiteEsqueci = { rateLimit: { max: env.isTest ? 1000 : 5, timeWindow: '15 minutes' } }
const VALIDADE_LINK_MS = 60 * 60 * 1000
const LINK_INVALIDO = 'Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'
const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export async function rotasConta(app: FastifyInstance) {
  app.post('/api/conta/cadastro', { config: limiteLogin }, async (req, reply) => {
    const d = parse(esquemaCadastro, req.body)
    const existentes = await db
      .select({ email: usuarios.email, cpf: usuarios.cpf })
      .from(usuarios)
      .where(or(eq(usuarios.email, d.email), eq(usuarios.cpf, d.cpf)))
    if (existentes.some((u) => u.email === d.email)) throw conflict('Já existe uma conta com este e-mail.')
    if (existentes.length) throw conflict('Já existe uma conta com este CPF.')
    const senhaHash = await hashPassword(d.senha)
    const u = await db.transaction(async (tx) => {
      const [novo] = await tx
        .insert(usuarios)
        .values({ nome: d.nome, sobrenome: d.sobrenome, cpf: d.cpf, celular: d.celular, email: d.email, senhaHash })
        .returning()
      await tx.insert(perfis).values({ usuarioId: novo.id, ...PERFIL_INICIAL })
      return novo
    })
    return reply.status(201).send(await abrirSessao(req, reply, u))
  })

  app.post('/api/conta/entrar', { config: limiteLogin }, async (req, reply) => {
    const { identificador, senha } = parse(esquemaEntrar, req.body)
    const id = identificador.toLowerCase()
    const cpf = soDigitos(id)
    const [u] = await db
      .select()
      .from(usuarios)
      .where(id.includes('@') ? eq(usuarios.email, id) : eq(usuarios.cpf, cpf))
      .limit(1)
    // Sem conta, confere contra um hash falso: o tempo de resposta não revela se o e-mail existe.
    const ok = await verifyPassword(u?.senhaHash, senha)
    if (!u || !ok) throw new HttpError(401, 'E-mail, CPF ou senha não conferem.', 'credenciais_invalidas')
    return abrirSessao(req, reply, u)
  })

  app.post('/api/conta/sair', async (req, reply) => {
    const token = tokenDaRequisicao(req)
    if (token) await encerrarSessao(token)
    reply.clearCookie(COOKIE_SESSAO, { path: '/' })
    return { ok: true }
  })

  // Responde sempre igual, para ninguém descobrir quais e-mails têm conta.
  app.post('/api/conta/esqueci', { config: limiteEsqueci }, async (req) => {
    const { email } = parse(z.object({ email: campoEmail }), req.body)
    const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)
    if (u) {
      const token = randomBytes(32).toString('base64url')
      await db.transaction(async (tx) => {
        await tx.delete(redefinicoesSenha).where(and(eq(redefinicoesSenha.usuarioId, u.id), isNull(redefinicoesSenha.usadoEm)))
        await tx.insert(redefinicoesSenha).values({ id: hashToken(token), usuarioId: u.id, expiraEm: new Date(Date.now() + VALIDADE_LINK_MS) })
      })
      const link = `${env.appUrl}/redefinir-senha?token=${token}`
      try {
        await sendMail({
          to: u.email,
          toName: `${u.nome} ${u.sobrenome}`,
          subject: 'Sobra: criar nova senha',
          text: `Olá, ${u.nome}!\n\nRecebemos um pedido para criar uma nova senha no Sobra. Abra o link abaixo (vale por 1 hora):\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
          html: `<div style="font-family:Arial,sans-serif;color:#1C1C1A;max-width:480px">
<p>Olá, ${escapar(u.nome)}!</p>
<p>Recebemos um pedido para criar uma nova senha no <b>Sobra</b>.</p>
<p><a href="${link}" style="display:inline-block;background:#5F7D6B;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
<p style="color:#6E6D69;font-size:14px">O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
</div>`,
        })
      } catch (err) {
        req.log.error(err, 'falha ao enviar e-mail de nova senha')
      }
    }
    return { ok: true }
  })

  app.post('/api/conta/redefinir', { config: limiteLogin }, async (req) => {
    const { token, senha } = parse(z.object({ token: z.string().min(20, LINK_INVALIDO).max(200), senha: campoSenha }), req.body)
    const usuarioId = await db.transaction(async (tx) => {
      const [r] = await tx
        .select()
        .from(redefinicoesSenha)
        .where(and(eq(redefinicoesSenha.id, hashToken(token)), isNull(redefinicoesSenha.usadoEm), gt(redefinicoesSenha.expiraEm, new Date())))
        .for('update')
      if (!r) throw badRequest(LINK_INVALIDO)
      await tx.update(usuarios).set({ senhaHash: await hashPassword(senha) }).where(eq(usuarios.id, r.usuarioId))
      await tx.update(redefinicoesSenha).set({ usadoEm: new Date() }).where(eq(redefinicoesSenha.id, r.id))
      return r.usuarioId
    })
    await encerrarSessoesDoUsuario(usuarioId)
    return { ok: true }
  })

  app.register(async (privado) => {
    privado.addHook('preHandler', autenticar)

    privado.get('/api/conta', async (req) => ({ usuario: dadosDoUsuario(req.usuario) }))

    privado.post('/api/conta/senha', async (req) => {
      const { atual, nova } = parse(z.object({ atual: z.string().max(200), nova: campoSenha }), req.body)
      if (!(await verifyPassword(req.usuario.senhaHash, atual))) throw badRequest('A senha atual não confere.')
      await db.update(usuarios).set({ senhaHash: await hashPassword(nova) }).where(eq(usuarios.id, req.usuario.id))
      await encerrarSessoesDoUsuario(req.usuario.id, tokenDaRequisicao(req))
      return { ok: true }
    })

    // Apaga a conta e tudo o que ela registrou (as tabelas apagam em cascata).
    privado.delete('/api/conta', async (req, reply) => {
      await db.delete(usuarios).where(eq(usuarios.id, req.usuario.id))
      reply.clearCookie(COOKIE_SESSAO, { path: '/' })
      return { ok: true }
    })
  })
}
