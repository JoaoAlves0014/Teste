# Clareza

Primeira versão do controle financeiro pessoal, em português, com Next.js e TypeScript.

## Desenvolvimento

Requer Node.js 24 e npm 11.

```sh
npm ci
npm run dev
```

Validação: `npm test`, `npm run typecheck`, `npm run build`. Produção: `npm start` após o build.

## O que funciona

- Painel com dinheiro disponível, reservas, garantia mensal C6 e repasses acumulados do pai.
- Cadastro e exclusão de receitas, saídas e repasses.
- Compras parceladas com valor total em centavos, parcelas futuras e cadastro de compras em andamento.
- Faturas por ciclo, pagamento integral após fechamento e cancelamento de pagamento pelo histórico.
- Teto pessoal do Nubank separado do limite bancário.
- Simulação de compra à vista ou parcelada sem juros, com distribuição exata dos centavos.
- Configurações editáveis e backup/restauração JSON.
- Interface responsiva para celular e computador.

## Limites desta versão

Dados ficam no localStorage deste navegador, sem autenticação ou sincronização. Não compartilhe um perfil de navegador que contém dados pessoais. Não há conexão ao banco, Supabase ou Google. Não cole credenciais na interface.

O disponível é conservador: caixa + reservas livres − faturas pendentes fechadas e o próximo ciclo de cada cartão − aporte mensal na garantia − orçamento variável − reserva de segurança. Salário futuro e repasses pendentes não entram no saldo. O aporte é apenas reservado nesta versão, não movimentado automaticamente.

## Compras e faturas

1. Configure fechamento e vencimento do cartão (dias de 1 a 31).
2. Na aba Cartões, registre o valor total e o número de parcelas. A distribuição preserva cada centavo; as primeiras parcelas recebem o resto da divisão.
3. Para compras em andamento, informe a próxima parcela pendente e o mês do fechamento correspondente. Parcelas anteriores não geram saídas retroativas; seu saldo inicial já deve refletir o passado.
4. Compras no dia do fechamento entram no próximo ciclo por padrão. Ajuste o mês explicitamente conforme o banco. Dias inexistentes são limitados ao último dia do mês. Vencimento anterior ao fechamento passa ao mês seguinte.
5. Após o fechamento, use Pagar e confirme. A saída e a liquidação são registradas juntas. Não crie uma saída manual adicional para a mesma fatura.
6. Para cancelar um pagamento, exclua-o em Movimentações. As parcelas voltam a ficar pendentes. Compras com pagamentos vinculados ficam protegidas contra exclusão até o cancelamento.

Compras novas guardam as datas de ciclo no momento do cadastro; alterações posteriores nas configurações valem para compras novas. Registros legados sem datas próprias seguem as configurações, com fallback de fim do mês se ainda não configuradas. O campo manual de mês serve para conferir o ciclo real no banco.

Não há juros, encargos ou pagamentos parciais. O limite de R$ 200 do C6 na visão geral é a referência inicial, não uma consulta ao banco.

A simulação ainda é estimativa estática: primeiro mês usa saldo disponível, demais meses usam salário menos reservas e faturas reservadas atuais. Não substitui projeção com todas as despesas futuras. O quinto dia útil, feriados de Curitiba, empréstimos e investimentos ainda precisam de implementação antes de usar o app como previsão financeira completa.

Testes de interface: mantenha `npm start` em execução após o build e execute `npm run test:e2e`. O Playwright usa Chromium em `/usr/bin/chromium`.

## Próxima etapa

Persistência no Supabase com autenticação Google e políticas por usuário; transferências e empréstimos; calendário de salário e projeção até o próximo pagamento. Nenhum valor de chave secreta deve ser versionado.

## Publicar na Vercel

No painel da Vercel, escolha Add New → Project e importe `JoaoAlves0014/Teste`. Framework: Next.js; Root Directory: raiz do repositório; Install Command: `npm ci`; Build Command: `npm run build`; Output Directory: padrão do Next.js. Node.js: 24.x. Esta versão não exige variáveis de ambiente. Clique em Deploy e use o domínio gerado pela Vercel.

O app publicado não tem autenticação: cada navegador mantém seus próprios registros locais. Os dados não são enviados a um banco de dados. Não existe sincronização entre dispositivos, e limpar o armazenamento do site apaga os registros locais. Faça backups pela tela Configurações. O domínio de produção tem armazenamento distinto do ambiente de desenvolvimento e das URLs de preview.

## Integração Supabase (preparada)

Veja [supabase/SETUP.md](supabase/SETUP.md) para SQL, políticas por usuário, Google OAuth e variáveis públicas. Com as variáveis configuradas, o app exige login e permite salvar/carregar a conta na nuvem explicitamente. Sem elas, permanece no modo local. A configuração real do projeto e o login Google precisam ser validados antes de anunciar a sincronização em produção.
