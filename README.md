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

Os dados vêm da API pública do **DivulgaCandContas** do TSE:

| O quê | Endpoint |
| --- | --- |
| Eleições (onde está o ID de 2026: `20322002026`) | `GET /divulga/rest/v1/eleicao/ordinarias` |
| Candidatos por UF e cargo | `GET /divulga/rest/v1/candidatura/listar/2026/{UF}/20322002026/{codCargo}/candidatos` |
| Foto | `GET /divulga/rest/arquivo/img/20322002026/{idCandidato}/{UF}` |

Base: `https://divulgacandcontas.tse.jus.br`. Para presidente, a UF é `BR`.
Códigos de cargo: 1 Presidente, 3 Governador, 5 Senador, 6 Dep. Federal,
7 Dep. Estadual, 8 Dep. Distrital (DF).

Campos usados da listagem: `id`, `numero`, `nomeUrna`, `partido.sigla`,
`descricaoSituacao`. O número do partido são os dois primeiros dígitos do
número do candidato.

Cargos, códigos e quantidade de dígitos ficam em `src/config/election.ts`.

## Cache

`src/lib/tse.ts` baixa a listagem de um cargo em uma UF uma única vez e a
guarda em memória no servidor por 1 hora. As consultas seguintes para a
mesma UF/cargo não chamam o TSE de novo. A variável `TSE_API_BASE` permite
apontar para outra base (por exemplo, um mock em testes).

## Impressão

O botão **Imprimir colinha** chama `window.print()`. O CSS `@media print`
esconde cabeçalho, campos, botões e instruções e ajusta a colinha para uma
folha A4. No celular, é possível simplesmente tirar um print da colinha.
