# Como publicar o Sobra

Ao final você tem:

- o **site** num endereço como `https://sobra.onrender.com` (abre no computador e no celular);
- a **API e o banco de dados** que o site e o app de celular usam;
- o **app de celular** apontando para esse endereço.

Você vai usar 3 serviços, os mesmos do Validei:

| Serviço | Para quê |
|---|---|
| **GitHub** (github.com) | Guarda o código (o repositório `controle-financeiro-2` já existe) |
| **Neon** (neon.tech) | Banco de dados (PostgreSQL) |
| **Render** (render.com) | Roda a API e o site e dá o endereço (plano Starter, US$ 7/mês) |

Tempo: uns 20 minutos.

---

## 1. Deixar o código no branch principal

O Render publica o branch `main`. Se o pull request do app ainda estiver aberto no GitHub, abra-o e clique em **Merge pull request**.

## 2. Criar o banco de dados no Neon

1. Entre em https://neon.tech e crie uma conta (pode usar a do GitHub).
2. Crie um projeto:
   - **Name:** `sobra`
   - **Postgres version:** 16 (ou a mais nova)
   - **Region:** a mais próxima do Brasil (ex.: *AWS São Paulo* ou *US East*).
3. Na tela do projeto, clique em **Connect**.
4. **Desligue** a opção **Connection pooling**.
5. Copie o texto que começa com `postgresql://...`. Esse é o **endereço do banco**.
   - Ele contém a senha do banco: não mande para ninguém nem coloque no código.

## 3. Publicar no Render

1. Entre em https://render.com com a conta do GitHub.
2. Clique em **New → Blueprint** e escolha o repositório `controle-financeiro-2`.
   (Se não aparecer, clique em **Configure GitHub** e libere o acesso a ele.)
3. O Render lê o `render.yaml` do projeto e mostra o serviço **sobra** (plano Starter).
4. Ele pede o valor de **DATABASE_URL**: cole o endereço do banco do passo 2.
   - `BREVO_API_KEY` e `MAIL_FROM` podem ficar vazios por enquanto (veja "E-mail de nova senha" abaixo).
5. Clique em **Apply**.
6. Aguarde a publicação (uns 5 a 10 minutos na primeira vez). Quando aparecer **Live**, o endereço fica no topo da página.

Abra o endereço, crie a conta e use. As tabelas do banco são criadas sozinhas na primeira vez.

> Se o nome `sobra` já estiver em uso no Render, ele cria com um final diferente (ex.: `sobra-x1y2.onrender.com`). Nesse caso, faça o passo 4 com o endereço que ele deu.

## 4. Apontar o app de celular para o servidor

O app precisa saber o endereço do servidor.

- **Para gerar o app das lojas:** em `eas.json`, troque `https://sobra.onrender.com` pelo seu endereço (aparece duas vezes) e gere o build normalmente (veja o README).
- **Para testar no Expo Go usando o servidor publicado:** no terminal do VS Code (Command Prompt), rode:

```cmd
set EXPO_PUBLIC_API_URL=https://sobra.onrender.com
npx expo start --go
```

Sem essa variável, o app em desenvolvimento procura a API no seu computador (porta 3333). Veja "Rodando no computador" no README.

## E-mail de nova senha (opcional)

O "Esqueci minha senha" manda um link por e-mail usando a Brevo (grátis até 300 e-mails por dia):

1. Crie uma conta em https://www.brevo.com e confirme um remetente (o e-mail que vai aparecer como "de").
2. Em **SMTP & API → API Keys**, crie uma chave.
3. No Render, em **Environment**, preencha `BREVO_API_KEY` com a chave e `MAIL_FROM` com o e-mail do remetente, e clique em **Save, rebuild and deploy**.

Sem isso, todo o resto funciona; só o e-mail de nova senha não é enviado.

## Como atualizar depois

Cada vez que um pull request for juntado ao `main`, o Render publica sozinho em alguns minutos.

## Bom saber

- No plano Starter do Render o servidor fica sempre ligado (o grátis "dorme" depois de 15 minutos sem uso).
- O plano grátis do Neon aguenta bem o começo; se o app crescer, dá para subir de plano lá.
- Um domínio próprio (ex.: `sobra.com.br`) pode ser ligado depois em Render → **Settings → Custom Domains**.
- O Render também oferece banco de dados próprio, mas o gratuito expira depois de 30 dias. Por isso usamos o Neon, como no Validei. Se preferir o do Render (pago), é só colocar o endereço dele no `DATABASE_URL`.

## Se der erro

- **No Render, o deploy falhou:** abra a aba **Logs**, copie as últimas linhas e me mande.
- **"password authentication failed" ou "unsupported startup parameter":** confira se copiou o endereço do Neon inteiro e com **Connection pooling desligado**. Depois, em Render → **Environment**, corrija o `DATABASE_URL` e clique em **Save, rebuild and deploy**.
- **O app de celular diz "Sem conexão com o servidor":** confira o `EXPO_PUBLIC_API_URL` e abra o endereço no navegador do celular para "acordar" o servidor.
