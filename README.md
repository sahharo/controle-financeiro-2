# Sobra

Aplicativo de controle financeiro que responde uma pergunta: **quanto você pode gastar hoje**.
Feito em React Native + TypeScript com [Expo](https://expo.dev), pronto para publicar na App Store e no Google Play.

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

A lógica fica em `src/lib` e tem testes em `src/lib/__tests__`.

## Dados e privacidade

Tudo fica **só no aparelho**: dados no armazenamento local do app e a senha apenas como hash com sal no chaveiro do sistema (Keychain/Keystore). Não há servidor. Para sincronizar entre aparelhos no futuro será preciso um back-end.

## Rodando

```bash
npm install
npx expo start
```

O registro por voz, a biometria e as notificações usam módulos nativos. No **Expo Go** a voz não está disponível (o app cai para o modo texto); para testar tudo, gere um build de desenvolvimento:

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
```

Verificações:

```bash
npm run typecheck
npm run lint
npm test
```

## Publicando nas lojas

1. Crie uma conta na Expo e rode `npx eas-cli@latest init` para vincular o projeto.
2. Confira o identificador do app em `app.json` (`ios.bundleIdentifier` e `android.package`, hoje `app.sobra.financas`).
3. Troque os links de Termos de uso e Política de privacidade em `src/lib/config.ts` pelos endereços reais (as duas lojas exigem a política de privacidade).
4. Gere os builds de produção e envie:

```bash
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios       # precisa de conta no Apple Developer Program
npx eas-cli@latest submit --platform android   # precisa de conta no Google Play Console
```

## Estrutura

```
src/
  app/            telas (Expo Router)
    (abas)/       Início, Gastos, Metas, Perfil + barra inferior
  components/     componentes visuais do design system
  hooks/          dados derivados do estado, voz
  lib/            cálculos, interpretador de frases, importação, segurança
  store/          estado global (zustand, salvo no aparelho)
  theme/          cores e fontes da identidade neutro quente
```
