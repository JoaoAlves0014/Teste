# Conectar o projeto Supabase

Projeto: `https://zevonxoyngnjgrlacyia.supabase.co`.

## Banco de dados

No painel desse projeto, abra **SQL Editor → New query**, copie o arquivo `migrations/202611060001_finance_accounts.sql` e execute uma vez. Não desative RLS. A tabela guarda um documento financeiro por usuário; isso mantém compras e pagamentos numa transação. As políticas restringem leitura/escrita ao `auth.uid()`. A RPC usa a versão lida para rejeitar alterações concorrentes.

## Login Google

1. No Google Cloud Console, configure a tela de consentimento OAuth e crie um cliente OAuth do tipo **Web application**. Durante testes, cadastre seu e-mail nos usuários de teste se exigido pelo Google.
2. Em **Authorized redirect URIs**, informe `https://zevonxoyngnjgrlacyia.supabase.co/auth/v1/callback`.
3. No Supabase, em **Authentication → Sign In / Providers → Google**, habilite o provedor e cole o Client ID e Client Secret nos campos seguros. Nunca coloque o Client Secret no código ou em variáveis NEXT_PUBLIC.
4. Em **Authentication → URL Configuration**, defina Site URL como `https://clareza-financeiro-blush.vercel.app` e adicione essa URL às Redirect URLs. Para desenvolvimento local, adicione separadamente a URL local usada. Não é necessário liberar todos os previews.

## Aplicação

Em **Vercel → projeto → Settings → Environment Variables**, configure:

- `NEXT_PUBLIC_SUPABASE_URL`: `https://zevonxoyngnjgrlacyia.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: a chave **publishable** (`sb_publishable_...`) de Settings → API Keys no Supabase. A chave `anon` legada também funciona.

Use as mesmas variáveis em um `.env.local` ignorado para desenvolvimento. Elas são públicas por definição; a autorização depende de sessão e RLS. **Nunca use service_role, sb_secret_, senha do banco ou Client Secret Google nesses campos.**

Alterações NEXT_PUBLIC exigem novo build. Publicar na Vercel só depois de revisar o código e configurar o banco e o provedor. Enquanto ambas as variáveis estiverem ausentes, o app mantém o modo local. Com configuração completa, exige login antes de exibir os registros financeiros.

## Uso e migração

- Faça um backup do modo local antes de conectar a conta.
- Após entrar, a conta é carregada da nuvem; se ainda não existir, começa vazia.
- **Importar dados locais** copia os registros anteriores deste navegador para a tela após confirmação. A conta só muda ao clicar em **Salvar na nuvem**. Os dados locais originais são preservados.
- Alterações ficam em rascunhos locais identificados por usuário e revisão. **Salvar na nuvem** é explícito; **Recarregar conta** traz o estado de outro dispositivo.
- Outra sessão que salvar primeiro causa conflito. Não ocorre sobrescrita automática. Exporte uma cópia das alterações, recarregue e reconcilie os registros antes de salvar.
- Sair remove a sessão, mas mantém o rascunho identificado por usuário neste navegador. Prefira perfil de navegador privado em computadores compartilhados.

## Validação

`npm test`, `npm run typecheck`, `npm run build`.

`npx playwright test --config playwright.cloud.config.ts` testa a interface com Supabase simulado. `npm run test:e2e` testa o modo local com servidor iniciado sem as variáveis Supabase.

Os testes simulados não provam configuração real de OAuth, RLS ou rede. Depois de executar a migração e configurar o provedor, validar com duas contas reais: cada uma deve ver somente seus dados, leitura direta da outra deve ser negada; salvar em um dispositivo e recarregar em outro; testar conflito e logout. Isso ainda exige execução no projeto real.
