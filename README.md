# Projeto de Vida — Dashboard

Dashboard pessoal dark premium para organização, acompanhamento de metas e visualização de progresso. O projeto foi criado para funcionar como site estático no GitHub Pages e também incorporado ao Notion.

- Repositório oficial: https://github.com/ryanpinheiro/Notion
- GitHub Pages: https://ryanpinheiro.github.io/Notion/
- Modo embed: https://ryanpinheiro.github.io/Notion/?embed=true

## Arquitetura

O navegador consome somente arquivos HTML, CSS, JavaScript e JSON públicos. A camada `DataProvider` separa a interface da origem dos dados. Quando a integração real for ativada, um workflow consulta o Notion no ambiente protegido do GitHub Actions, sanitiza as informações e grava apenas indicadores públicos agregados.

```text
Notion → GitHub Actions → sanitização → JSON público → GitHub Pages
```

O token do Notion nunca é enviado ao navegador.

## Estrutura

- `index.html` — visão geral e navegação entre áreas
- `habits.html` — dashboard completo de hábitos e consistência
- `finances.html`, `work.html`, `studies.html`, `roadmap.html` — módulos iniciais
- `assets/css/` — tokens visuais, componentes e responsividade
- `assets/js/` — interface, gráficos, heatmap e camada de dados
- `assets/data/` — dados públicos demonstrativos ou sanitizados
- `scripts/sync-notion.mjs` — consulta e sanitização do Notion
- `.github/workflows/` — sincronização e publicação

## Desenvolvimento local

É necessário Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Para verificar páginas, referências locais e JSON:

```bash
npm run check
```

## GitHub Pages

O workflow `deploy-pages.yml` publica a branch `main` usando as actions oficiais do GitHub Pages. No repositório, selecione **Settings → Pages → Source → GitHub Actions**.

Todos os caminhos do frontend são relativos e compatíveis com o subdiretório `/Notion/`.

## Modo embed

Adicione `?embed=true` a qualquer página. Esse modo remove a navegação externa, reduz margens e aproveita a largura disponível no iframe do Notion.

- `https://ryanpinheiro.github.io/Notion/?embed=true`
- `https://ryanpinheiro.github.io/Notion/habits.html?embed=true`

## Integração com Notion

A integração permanece desativada enquanto os Secrets não forem configurados. Os nomes necessários estão documentados em `.env.example` e devem ser cadastrados em **Settings → Secrets and variables → Actions**.

Nunca versione `.env`, tokens, IDs reais sensíveis ou exportações completas. O arquivo `.env.example` contém somente chaves vazias.

## Segurança e privacidade

O conteúdo atual usa exclusivamente dados `MOCK/DEMO`. Dados públicos podem incluir contagens, percentuais, sequências e séries agregadas. Não devem ser publicados nomes de credores, valores detalhados de dívidas, candidaturas identificáveis, contatos, currículos, observações pessoais ou links privados.

A função `sanitizeDashboard` é a fronteira explícita entre os registros privados e os arquivos públicos.

## Atualização e evolução

Para atualizar o site, altere os arquivos, valide com `npm run check` e envie para a branch `main`. O deploy será disparado automaticamente.

Para adicionar um hábito, inclua um item em `assets/data/habits.json`; os cards e gráficos são gerados a partir desse arquivo. Para criar um módulo, reutilize os componentes de `main.css`, adicione seu JSON em `assets/data/` e carregue-o pelo `DataProvider`.

## Sincronização real de hábitos

A Fase 2 integra exclusivamente os Data Sources privados de **Hábitos** e **Registro diário — Hábitos**. Seus identificadores devem ser cadastrados nos Secrets `NOTION_HABITS_DATABASE_ID` e `NOTION_HABIT_LOG_DATABASE_ID`; o valor real do `NOTION_TOKEN` também existe somente nos Secrets.

O arquivo público contém apenas nome, área, status ativo, meta semanal, duração alvo, dias planejados e agregados necessários para KPIs, heatmap e gráficos. Observações, URLs do Notion, IDs de páginas, relações, metadados e timestamps internos são descartados antes da escrita.

A taxa de conclusão é `Feito / (Feito + Não feito)`. Registros “Pulado / não aplicável” não entram no denominador; sem registros avaliáveis, a taxa é `null` e a interface mostra um estado neutro. Um dia contribui para a sequência quando possui ao menos um registro “Feito”. A contagem começa no primeiro registro existente, sem penalizar datas anteriores.

O heatmap classifica cada data como `none`, `done`, `missed`, `partial` ou `skipped`. Durações nulas valem zero apenas para somas e nunca produzem `NaN`.

O processo busca todas as páginas dos dois Data Sources, valida e agrega os resultados, escreve um arquivo temporário, valida novamente e só então substitui `assets/data/habits.json`. Qualquer falha de rede, API ou validação preserva o último JSON público válido e encerra o workflow com erro.

Para executar manualmente depois de configurar as variáveis localmente:

```bash
npm run sync
```

Sem `NOTION_TOKEN`, o comando não consulta o Notion e preserva os dados existentes. Os testes de agregação, paginação e fail-safe podem ser executados com `npm test`.
