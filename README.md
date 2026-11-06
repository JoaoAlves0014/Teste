# Clareza

Controle financeiro pessoal em português, com Next.js, TypeScript, Supabase e login Google. Funciona no computador e no celular, com temas claro e escuro.

## Desenvolvimento

Node.js 24 e npm 11. Use o checkout existente, sem criar worktrees.

```sh
npm ci
npm run dev
```

Sem variáveis Supabase, roda no modo local. Para conectar uma conta, siga [supabase/SETUP.md](supabase/SETUP.md). Nunca configure chaves secret ou service_role como NEXT_PUBLIC.

Validação: `npm test`, `npm run typecheck`, `npm run build`. Após o build, `npm start` e `npm run test:e2e` validam o modo local. `npx playwright test --config playwright.cloud.config.ts` valida autenticação e persistência simuladas.

## Previsão financeira

- O disponível de hoje usa dinheiro recebido e reservas livres, descontando segurança, garantia C6 restante, orçamento variável restante e despesas/faturas até o próximo salário. Não antecipa salário ou repasses pendentes do pai.
- Ciclos vão do dia do salário até antes do próximo pagamento. O quinto dia útil conta sábado, exclui domingo, feriados nacionais, Sexta-feira Santa, Corpus Christi e 8 de setembro em Curitiba. Consciência Negra é incluída desde 2024. Carnaval, pontos facultativos e outras regras do empregador exigem datas adicionais nas configurações.
- O salário de cada mês pode ser ajustado. A projeção não cria recebimentos: registre **Salário recebido** quando o dinheiro entrar. O mês é identificado pela data informada; um recebimento identificado substitui a previsão do mesmo mês.
- No dia do salário, o disponível continua dependendo do recebimento real; o próximo salário previsto passa a ser o do mês seguinte.
- Registre **Aporte na garantia C6** quando separar o dinheiro. Ele sai do caixa e reduz a reserva restante desse compromisso no ciclo atual. Não há saldo de garantia disponível para gastar.
- Saídas comuns consomem o orçamento variável do ciclo. Pagamentos vinculados a despesas previstas ficam separados desse orçamento para evitar dupla reserva.
- A reserva de segurança é um saldo mínimo mantido, não uma despesa debitada novamente todo mês.
- Os ciclos futuros acumulam saldo, salário, despesas previstas e parcelas reais. O menor saldo sinaliza déficit antes de uma receita futura. Na mesma data futura, entradas são consideradas antes das saídas; confira o horário efetivo com o banco.

## Despesas previstas

Em Movimentações, cadastre despesas únicas ou mensais com início e fim opcionais. Uma assinatura parcelada ou empréstimo com prestação fixa pode ser representado como despesa mensal até a última data; não há cálculo de juros/amortização de empréstimo.

Uma previsão não movimenta o caixa. No vencimento ou depois, **Registrar pagamento** cria a saída e liquida a ocorrência. Pendências antigas continuam reservadas. Excluir o pagamento no histórico reabre a ocorrência. Planos já pagos ficam protegidos contra exclusão; para interromper uma recorrência, encerre-a. Não registre saída manual adicional para a mesma conta. Dias 29–31 são ajustados ao último dia dos meses menores.

## Cartões

Configure fechamento e vencimento. Cadastre valor total e parcelas; para compras antigas, indique a primeira parcela pendente e o mês do fechamento correspondente. As parcelas anteriores não geram saídas retroativas.

Compras no dia do fechamento entram no próximo ciclo por padrão. Ajuste o mês segundo o banco. Compras novas guardam as datas de ciclo; mudanças de configuração valem para novas compras. Registros legados sem datas seguem as configurações, com fallback de fim do mês.

Faturas são previstas no fechamento, conforme a preferência de pagamento. Após fechar, **Pagar** cria a saída e liquida as parcelas numa operação. Excluir o pagamento desfaz a liquidação. Não há juros, encargos ou pagamentos parciais. O painel C6 usa R$ 200 como referência inicial; confira o limite efetivo no banco.

## Simulador

Compara pagamento à vista ou cartão sem juros, sem criar compras reais. Usa os ciclos de salário e as parcelas existentes, mostra pagamentos por ciclo, saldo final e menor saldo. A recomendação de máximo usa os dados cadastrados no horizonte exibido (mínimo seis ciclos; maior em compras parceladas), teto pessoal Nubank e limite bancário informado de R$ 4.000. Não consulta nem garante aprovação de crédito. No C6, o limite precisa ser conferido pelo usuário. Despesas não cadastradas não podem ser previstas.

## Dados e publicação

Com Supabase configurado, login obrigatório e dados por usuário sob RLS. **Salvar na nuvem** é explícito; **Recarregar conta** traz alterações de outro dispositivo. A importação de dados locais exige confirmação. Sem Supabase, tudo fica neste navegador. Faça backups JSON pelas configurações.

O modelo JSON aceita os campos novos sem migração adicional de banco; backups antigos permanecem aceitos. O modo escuro usa preferência de sistema ou escolha local.

A Vercel acompanha `main` em `JoaoAlves0014/Teste`. Framework Next.js, diretório raiz, Node 24.x e build padrão. Variáveis NEXT_PUBLIC exigem novo build. Configuração e testes reais do banco estão descritos em [supabase/SETUP.md](supabase/SETUP.md).

## Edição, categorias, metas e conferências

- Em Movimentações, use o ícone de edição no histórico. Na aba Cartões, as compras também possuem botão Editar. Alterações sem pagamento recalculam saldo e parcelas. Compras e planos com pagamentos vinculados permitem descrição e categoria; para valores/datas/parcelas, cancele primeiro os pagamentos correspondentes. Pagamentos vinculados têm valor fixo para preservar a liquidação. O editor valida todos os vínculos antes de salvar.
- Categorias são informadas em lançamentos, planos e compras. O resumo mensal soma saídas realizadas e parcelas atribuídas ao mês de fechamento. Exclui pagamentos de fatura para não duplicar gastos, além de previsões ainda não pagas, garantia e metas. Registros antigos permanecem em Sem categoria.
- As contas C6 e Reserva livre são identificadas nos lançamentos realizados. Registros antigos sem conta são do C6. Pagamentos novos de fatura e despesas previstas são do C6 por padrão; a conta pode ser corrigida na edição. Isso permite comparar saldos de cada conta separadamente, mantendo o total financeiro.
- Em Configurações, Conferir com o banco registra o saldo ou total de fatura observado e a diferença para o sistema naquela data. É uma conferência manual, sem integração bancária ou ajuste automático. Após corrigir registros, faça nova conferência. As anteriores preservam os valores que foram comparados.
- Em Metas, informe objetivo, valor já separado do dinheiro existente, aporte mensal planejado e prazo opcional. Reservas de metas reduzem o disponível e todos os ciclos projetados sem criar receitas ou saídas; a interface limita novas reservas ao dinheiro livre. A data estimada considera aportes a partir do próximo mês, sem movimentá-los automaticamente. Alterar o valor separado é uma alocação do saldo, não uma transferência bancária.
- Comparar compra dentro de uma meta libera apenas a reserva daquela meta na simulação. As outras metas permanecem protegidas. Excluir uma meta libera sua alocação, sem modificar o saldo bancário.
- Lembretes no painel destacam contas vencidas, vencimentos e fechamentos próximos e o salário previsto. A antecedência é configurável em 3, 7, 15 ou 30 dias. Os atalhos levam à tela de pagamento correspondente. Não há e-mails, notificações push ou execução em segundo plano.

Os campos novos continuam dentro do documento por usuário no Supabase, sem nova migração SQL. Use Salvar na nuvem para sincronizar as alterações.

## Próximas melhorias

Rendimentos e investimentos; transferências entre contas; cálculo de empréstimos com juros; atualização independente do limite C6.
