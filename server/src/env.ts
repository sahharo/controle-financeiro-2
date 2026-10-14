export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://sobra:sobra@localhost:5432/sobra',
  port: Number(process.env.PORT ?? 3333),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  isTest: process.env.NODE_ENV === 'test',
  // E-mail de "esqueci minha senha" (API HTTP da Brevo). Sem chave, o link só aparece no log local.
  brevoApiKey: process.env.BREVO_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? '',
  // Endereço público usado nos links por e-mail; o Render informa RENDER_EXTERNAL_URL sozinho.
  appUrl: (process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:8081').replace(/\/+$/, ''),
  isLocal: !process.env.RENDER && process.env.NODE_ENV !== 'production',
}
