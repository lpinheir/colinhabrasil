# Colinha Eleitoral 2026

Aplicação web simples para montar a colinha das eleições gerais de 2026.
Não usa banco de dados, login ou armazenamento. Mostra só os números que o
eleitor digitar, sem recomendar candidatos.

Next.js + TypeScript + Tailwind CSS.

## Rodando

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Fonte de dados (TSE)

Os candidatos vêm do arquivo oficial do Portal de Dados Abertos do TSE:
[Candidatos 2026](https://dadosabertos.tse.jus.br/dataset/candidatos-2026)
(`https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip`).

A API do DivulgaCandContas bloqueia servidores em nuvem (incluindo a Vercel) e
não aceita chamadas diretas do navegador (sem CORS). Por isso o site não
consulta o TSE a cada busca. Em vez disso:

1. `scripts/sync-tse.mjs` baixa o ZIP oficial, lê os CSVs por UF e gera um
   JSON compacto por UF em `public/data/candidatos/{UF}.json` (presidente em
   `BR.json`). Guarda só cargo, número, nome de urna, partido, número do
   partido, ID do candidato e situação.
2. A GitHub Action `.github/workflows/sync-tse.yml` roda esse script a cada 6
   horas e faz commit se algo mudou. A Vercel republica o site sozinha.
3. No navegador, `getCandidate()` (`src/lib/candidates.ts`) baixa o arquivo da
   UF uma única vez e busca o número nele.

As fotos são carregadas pelo navegador direto do TSE:
`https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/20322002026/{id}/{UF}`.

Para atualizar os dados manualmente (por exemplo, se o TSE bloquear a Action):

```bash
npm run sync:tse                   # baixa do TSE
npm run sync:tse -- caminho.zip    # usa um ZIP baixado pelo navegador
git add public/data/candidatos && git commit -m "Atualiza dados do TSE" && git push
```

Cargos, códigos e quantidade de dígitos ficam em `src/config/election.ts`.

## Impressão

O botão **Imprimir colinha** chama `window.print()`. O CSS `@media print`
esconde cabeçalho, campos, botões e instruções e ajusta a colinha para uma
folha A4. No celular, é possível simplesmente tirar um print da colinha.
