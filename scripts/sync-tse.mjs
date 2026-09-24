#!/usr/bin/env node
/**
 * Baixa o arquivo oficial de candidatos de 2026 do Portal de Dados Abertos do
 * TSE e gera um JSON compacto por UF em public/data/candidatos/.
 *
 *   npm run sync:tse                 # baixa do TSE
 *   npm run sync:tse -- arquivo.zip  # usa um ZIP já baixado
 *
 * Fonte: https://dadosabertos.tse.jus.br/dataset/candidatos-2026
 *
 * A API do DivulgaCandContas bloqueia servidores em nuvem (como a Vercel) e não
 * aceita chamadas diretas do navegador (sem CORS), por isso os dados são
 * espelhados aqui em arquivos estáticos.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";

const SOURCE_URL =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUTPUT_DIR = new URL("../public/data/candidatos/", import.meta.url);
// 1 Presidente, 3 Governador, 5 Senador, 6 Dep. Federal, 7 Dep. Estadual, 8 Dep. Distrital
const OFFICE_CODES = new Set(["1", "3", "5", "6", "7", "8"]);

async function loadZip() {
  const localFile = process.argv[2];
  if (localFile) return new Uint8Array(await readFile(localFile));

  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "colinha-eleitoral/1.0 (+https://github.com/lpinheir/colinhabrasil)" },
  });
  if (!res.ok) throw new Error(`TSE respondeu ${res.status} ao baixar ${SOURCE_URL}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** CSV do TSE: separado por ";", campos entre aspas, codificação Latin-1. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ";") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) rows.push([...row, field]);
  return rows;
}

const clean = (v) => (v && !v.startsWith("#NULO") && v !== "#NE" && v !== "#NE#" ? v.trim() : "");

function isApt(situation) {
  return situation.toUpperCase().startsWith("APTO");
}

function convert(csvBytes) {
  const [header, ...rows] = parseCsv(new TextDecoder("latin1").decode(csvBytes));
  const col = (name) => header.indexOf(name);
  const idx = {
    office: col("CD_CARGO"),
    seq: col("SQ_CANDIDATO"),
    number: col("NR_CANDIDATO"),
    ballotName: col("NM_URNA_CANDIDATO"),
    name: col("NM_CANDIDATO"),
    party: col("SG_PARTIDO"),
    partyNumber: col("NR_PARTIDO"),
    situation: col("DS_SITUACAO_CANDIDATURA"),
    detail: col("DS_DETALHE_SITUACAO_CAND"),
  };
  for (const key of ["office", "seq", "number", "ballotName", "party"]) {
    if (idx[key] < 0) throw new Error(`Coluna esperada não encontrada no CSV: ${key}`);
  }

  // offices[codCargo][numero] = [nome, partido, nºpartido, sq, situação]
  const offices = {};
  const aptness = {};
  for (const r of rows) {
    const office = clean(r[idx.office]);
    if (!OFFICE_CODES.has(office)) continue;
    const number = clean(r[idx.number]);
    const seq = clean(r[idx.seq]);
    if (!number || !seq) continue;

    const situation = clean(r[idx.situation] ?? "");
    const status = clean(r[idx.detail] ?? "") || situation;
    const entry = [
      clean(r[idx.ballotName]) || clean(r[idx.name] ?? ""),
      clean(r[idx.party]),
      clean(r[idx.partyNumber] ?? "") || number.slice(0, 2),
      seq,
      status,
    ];

    // Um mesmo número pode aparecer mais de uma vez (substituições, novos
    // pedidos). Fica o registro apto; em empate, o mais recente (maior SQ).
    offices[office] ??= {};
    aptness[office] ??= {};
    const current = offices[office][number];
    const apt = isApt(situation);
    if (
      !current ||
      (apt && !aptness[office][number]) ||
      (apt === aptness[office][number] && BigInt(seq) > BigInt(current[3]))
    ) {
      offices[office][number] = entry;
      aptness[office][number] = apt;
    }
  }
  return offices;
}

const zip = unzipSync(await loadZip());
await mkdir(OUTPUT_DIR, { recursive: true });

let files = 0;
let total = 0;
for (const [filename, bytes] of Object.entries(zip)) {
  const match = filename.match(/consulta_cand_2026_([A-Z]{2})\.csv$/i);
  if (!match) continue;
  const uf = match[1].toUpperCase();
  const offices = convert(bytes);
  const count = Object.values(offices).reduce((n, o) => n + Object.keys(o).length, 0);
  if (!count) continue;

  const out = { source: SOURCE_URL, offices };
  await writeFile(new URL(`${uf}.json`, OUTPUT_DIR), JSON.stringify(out));
  files++;
  total += count;
  console.log(`${uf}: ${count} candidatos`);
}

if (!files) throw new Error("Nenhum arquivo consulta_cand_2026_UF.csv encontrado no ZIP");
console.log(`Pronto: ${total} candidatos em ${files} arquivos.`);
