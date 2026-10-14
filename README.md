# Sobra

Aplicativo de controle financeiro que responde uma pergunta: **quanto você pode gastar hoje**.
Tem app para iPhone e Android e site, todos usando a mesma conta e os mesmos dados.

- **App e site** (`src/`): React Native + TypeScript com [Expo](https://expo.dev). O mesmo código gera o app das lojas e o site (React Native Web).
- **API** (`server/`): Node.js 22 + Fastify 5 + TypeScript, Drizzle ORM, PostgreSQL 16, Zod, Argon2id. Mesma base do Validei.
- **Código compartilhado** (`shared/`): validações (CPF, e-mail, celular, regras de senha) usadas pelo app e pela API.
- **Publicação:** um serviço no **Render** roda a API e serve o site no mesmo endereço; o banco fica no **Neon**. Passo a passo em [PUBLICAR.md](PUBLICAR.md).

A identidade visual e as telas seguem o protótipo "Identidade visual do app financeiro" (paleta **neutro quente**: fundo off-white, um único verde-sálvia de destaque e terracota só para alertas; tipografia Geist e Geist Mono).

## Telas

| Acesso | Dia a dia | Metas, reservas e perfil |
| --- | --- | --- |
| Entrar (senha ou biometria) | Início: pode gastar hoje, sobra prevista, vencimentos da semana, últimos gastos | Metas e simulador de compra (em horas de trabalho) |
| Criar conta (CPF, celular, regras de senha) | Registrar gasto por **voz** ou texto | Caixinha (rende % do CDI, IR regressivo) |
| Onboarding em 3 passos (renda, fixos, cartão) | Gastos: variáveis por categoria, fixos (fixo, estimado, anual) e cartão (faturas e parcelas) | Reserva de emergência (3, 6 ou 12 meses) |
| | Próximos meses: prejuízo do mês anterior e quanto da renda já tem dono | Conquistas e Perfil (lembretes, biometria, importar/exportar) |

## Como os números são calculados

- **Pode gastar hoje** = (renda + extras − fixos − prejuízo lançado no mês − o que foi guardado − gastos variáveis até ontem) ÷ dias restantes, menos o que já foi gasto hoje.
- **Sobra prevista** usa o maior valor entre o que já foi gasto e a soma dos limites das categorias.
- **Parcelado** pesa uma parcela por mês a partir do mês da compra. A fatura do cartão segue o dia de fechamento: compras a partir do fechamento vão para a fatura seguinte.
- **Fixos estimados** (luz, água) usam a média dos 3 últimos valores pagos. **Anuais** (IPVA, seguro) entram divididos por 12.
- **Caixinha**: juros diários nos dias úteis sobre o CDI do Banco Central (série SGS 4389, atualizado uma vez por dia), descontando IR de 22,5% a 15% conforme o tempo guardado.

Os cálculos rodam no app (`src/lib`, com testes em `src/lib/__tests__`); o servidor guarda os dados e busca o CDI no Banco Central.

## Dados, conta e segurança

- Os dados ficam no **PostgreSQL**, separados por conta: toda consulta da API filtra pela pessoa logada.
- A senha é guardada só como hash **Argon2id** no servidor.
- **Site:** sessão em cookie HttpOnly (SameSite=Lax), com proteção contra CSRF.
- **App:** o token da sessão fica no chaveiro do aparelho (Keychain/Keystore) e vai em `Authorization: Bearer`.
- O app guarda uma cópia local para abrir na hora. Cada mudança aparece na tela e é enviada à API em seguida. Se o envio falhar (ex.: sem internet), o app avisa e volta ao que está salvo no servidor.
- "Esqueci minha senha" manda um link por e-mail (Brevo) que abre a tela de nova senha no site.
- "Pedir biometria ao abrir" trava o app no celular; no site não se aplica.

## Rodando no computador

```bash
# 1. PostgreSQL 16 (Docker) — ou use um banco do Neon
docker run -d --name sobra-pg -p 5432:5432 -e POSTGRES_USER=sobra -e POSTGRES_PASSWORD=sobra -e POSTGRES_DB=sobra postgres:16
docker exec sobra-pg createdb -U sobra sobra_test   # banco dos testes da API

# 2. API (porta 3333)
cd server
cp .env.example .env
npm install
npm run dev

# 3. App e site (outro terminal, na pasta do projeto)
npm install
npx expo start --go
```

- **Site:** aperte `w` no terminal do Expo (abre em `localhost:8081` e conversa com a API na 3333).
- **Celular (Expo Go):** o app procura a API no mesmo computador que roda o Expo, na porta 3333. Celular e computador precisam estar no mesmo Wi-Fi. Para usar o servidor publicado, veja o passo 4 do [PUBLICAR.md](PUBLICAR.md).

O registro por voz, a biometria e as notificações usam módulos nativos. No **Expo Go** a voz não está disponível (o app cai para o modo texto). Para testar tudo, gere um build de desenvolvimento:

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
```

## Verificações

```bash
npm run typecheck && npm run lint && npm test          # app e site
cd server && npm run typecheck && npm test             # API (precisa do PostgreSQL)
```

## Publicando nas lojas

1. Crie uma conta na Expo e rode `npx eas-cli@latest init` para vincular o projeto.
2. Confira o identificador do app em `app.json` (`ios.bundleIdentifier` e `android.package`, hoje `app.sobra.financas`).
3. Troque os links de Termos de uso e Política de privacidade em `src/lib/config.ts` pelos endereços reais (as duas lojas exigem a política de privacidade).
4. Confira em `eas.json` o `EXPO_PUBLIC_API_URL` (o endereço do servidor no Render).
5. Gere os builds de produção e envie:

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios       # precisa de conta no Apple Developer Program
npx eas-cli@latest submit --platform android   # precisa de conta no Google Play Console
```

## Estrutura

```
src/
  app/            telas (Expo Router), as mesmas no app e no site
    (abas)/       Início, Gastos, Metas, Perfil + barra inferior
  components/     componentes visuais do design system
  hooks/          dados derivados do estado, voz
  lib/            cálculos, interpretador de frases, importação, cliente da API
  store/          estado global (zustand) e sincronização com a API
  theme/          cores e fontes da identidade neutro quente
server/
  src/routes/     conta (cadastro, entrar, nova senha) e dados
  src/db/         tabelas (Drizzle) e migrações
  test/           testes da API contra PostgreSQL de verdade
shared/           validações usadas pelo app e pela API
render.yaml       configuração do Render
```
