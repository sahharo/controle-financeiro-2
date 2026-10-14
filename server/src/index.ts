import { criarApp } from './app.ts'
import { limparSessoesVencidas } from './auth/sessao.ts'
import { runMigrations } from './db/migrate.ts'
import { env } from './env.ts'
import { atualizarCdi } from './services/taxas.ts'

await runMigrations()
const app = await criarApp()
await app.listen({ port: env.port, host: '0.0.0.0' })

async function tarefasDeHora() {
  try {
    await limparSessoesVencidas()
  } catch (err) {
    app.log.error(err, 'falha ao limpar sessões')
  }
}
async function tarefasDoDia() {
  try {
    app.log.info({ cdi: await atualizarCdi() }, 'CDI atualizado')
  } catch (err) {
    app.log.warn(err, 'não deu para atualizar o CDI; mantendo o último valor')
  }
}
void tarefasDeHora()
void tarefasDoDia()
setInterval(tarefasDeHora, 3600_000).unref()
setInterval(tarefasDoDia, 6 * 3600_000).unref()
