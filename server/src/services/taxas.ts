import { eq } from 'drizzle-orm'
import { db } from '../db/client.ts'
import { taxas } from '../db/schema.ts'

/** CDI usado até a primeira busca no Banco Central dar certo. */
export const CDI_PADRAO = 14.9

export async function cdiAtual(): Promise<{ cdiAnual: number; atualizadoEm?: string }> {
  const [t] = await db.select().from(taxas).where(eq(taxas.chave, 'cdi'))
  if (!t) return { cdiAnual: CDI_PADRAO }
  return { cdiAnual: Number(t.valor), atualizadoEm: t.atualizadoEm.toISOString() }
}

/** Busca o CDI anualizado mais recente no Banco Central (série SGS 4389) e guarda. */
export async function atualizarCdi() {
  const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json', {
    signal: AbortSignal.timeout(15_000),
  })
  if (!r.ok) throw new Error(`Banco Central respondeu ${r.status}`)
  const dados = (await r.json()) as { valor: string }[]
  const cdi = Number(String(dados[0]?.valor).replace(',', '.'))
  if (!Number.isFinite(cdi) || cdi <= 0) throw new Error('CDI inválido na resposta do Banco Central')
  await db
    .insert(taxas)
    .values({ chave: 'cdi', valor: cdi })
    .onConflictDoUpdate({ target: taxas.chave, set: { valor: cdi, atualizadoEm: new Date() } })
  return cdi
}
