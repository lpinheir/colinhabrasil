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
 *
 * Também cruza os candidatos com os deputados federais em exercício (API de
 * Dados Abertos da Câmara) para guardar o ID da Câmara, usado no link do Olho
 * na Cota. Só os deputados em exercício entram: quem já saiu da Câmara (suplentes
 * que deixaram o cargo, deputados que viraram prefeitos etc.) fica sem ID e
 * recebe o link de busca por nome. O cruzamento usa CPF e, se faltar, nome civil + data de
 * nascimento. O CPF só é usado aqui e não vai para os arquivos publicados.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";

const SOURCE_URL =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUTPUT_DIR = new URL("../public/data/candidatos/", import.meta.url);
// 1 Presidente, 3 Governador, 5 Senador, 6 Dep. Federal, 7 Dep. Estadual, 8 Dep. Distrital
const OFFICE_CODES = new Set(["1", "3", "5", "6", "7", "8"]);
const CAMARA_API = process.env.CAMARA_API ?? "https://dadosabertos.camara.leg.br/api/v2";

// Os servidores do TSE e da Câmara recusam clientes que não parecem um navegador.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

async function loadZip() {
  const localFile = process.argv[2];
  if (localFile) return new Uint8Array(await readFile(localFile));

  const res = await fetch(SOURCE_URL, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/zip,application/octet-stream,*/*",
      Referer: "https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
    },
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

/** Nome sem acentos, em maiúsculas e com espaços simples, para comparação. */
const normalizeName = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
const onlyDigits = (s) => (s ?? "").replace(/\D/g, "");
/** "31/12/1970" → "1970-12-31" */
const isoDate = (s) => {
  const m = (s ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

async function getJson(url, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, {
        headers: { ...BROWSER_HEADERS, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`${res.status} em ${url}`);
      return await res.json();
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

/** Deputados federais em exercício, indexados por CPF e por nome civil + nascimento. */
async function loadCamaraDeputies() {
  const ids = new Set();
  for (let page = 1; ; page++) {
    // Sem filtro de legislatura, a API devolve só os deputados em exercício.
    const body = await getJson(
      `${CAMARA_API}/deputados?itens=100&pagina=${page}&ordem=ASC&ordenarPor=nome`,
    );
    const items = body.dados ?? [];
    for (const d of items) ids.add(String(d.id));
    if (items.length < 100) break;
  }
  if (!ids.size) throw new Error("A Câmara não retornou deputados");

  const byCpf = new Map();
  const byNameAndBirth = new Map();
  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.pop(); id; id = queue.pop()) {
      const { dados } = await getJson(`${CAMARA_API}/deputados/${id}`);
      const cpf = onlyDigits(dados?.cpf);
      if (cpf.length === 11) byCpf.set(cpf, id);
      if (dados?.nomeCivil && dados?.dataNascimento) {
        byNameAndBirth.set(`${normalizeName(dados.nomeCivil)}|${dados.dataNascimento}`, id);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`Câmara: ${ids.size} deputados em exercício`);
  return { byCpf, byNameAndBirth };
}

/** IDs da Câmara já publicados (por SQ do candidato), usados se a Câmara estiver fora do ar. */
async function loadPreviousCamaraIds() {
  const bySeq = new Map();
  const files = await readdir(OUTPUT_DIR).catch(() => []);
  for (const f of files.filter((f) => f.endsWith(".json"))) {
    const { offices } = JSON.parse(await readFile(new URL(f, OUTPUT_DIR), "utf8"));
    for (const rows of Object.values(offices)) {
      for (const row of Object.values(rows)) if (row[5]) bySeq.set(row[3], row[5]);
    }
  }
  return bySeq;
}

const clean = (v) => (v && !v.startsWith("#NULO") && v !== "#NE" && v !== "#NE#" ? v.trim() : "");

function isApt(situation) {
  return situation.toUpperCase().startsWith("APTO");
}

function convert(csvBytes, camara) {
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
    cpf: col("NR_CPF_CANDIDATO"),
    birth: col("DT_NASCIMENTO"),
  };
  for (const key of ["office", "seq", "number", "ballotName", "party"]) {
    if (idx[key] < 0) throw new Error(`Coluna esperada não encontrada no CSV: ${key}`);
  }

  // offices[codCargo][numero] = [nome, partido, nºpartido, sq, situação, idCâmara?]
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
    const camaraId = camara.find(seq, {
      cpf: onlyDigits(r[idx.cpf]),
      nameAndBirth: `${normalizeName(clean(r[idx.name] ?? ""))}|${isoDate(r[idx.birth])}`,
    });
    if (camaraId) entry.push(camaraId);

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

// A Câmara é opcional: se falhar, mantém os IDs já publicados e segue com o TSE.
let camara;
try {
  const { byCpf, byNameAndBirth } = await loadCamaraDeputies();
  camara = {
    find: (_seq, { cpf, nameAndBirth }) =>
      (cpf.length === 11 && byCpf.get(cpf)) || byNameAndBirth.get(nameAndBirth),
  };
} catch (err) {
  const cause = err.cause ? ` — ${err.cause.code ?? ""} ${err.cause.message ?? err.cause}` : "";
  console.warn(
    `Aviso: não foi possível consultar a Câmara (${err.message}${cause}). Mantendo IDs anteriores.`,
  );
  const previous = await loadPreviousCamaraIds();
  camara = { find: (seq) => previous.get(seq) };
}

let files = 0;
let total = 0;
let withCamaraId = 0;
for (const [filename, bytes] of Object.entries(zip)) {
  const match = filename.match(/consulta_cand_2026_([A-Z]{2})\.csv$/i);
  if (!match) continue;
  const uf = match[1].toUpperCase();
  const offices = convert(bytes, camara);
  const count = Object.values(offices).reduce((n, o) => n + Object.keys(o).length, 0);
  if (!count) continue;
  withCamaraId += Object.values(offices).reduce(
    (n, o) => n + Object.values(o).filter((row) => row[5]).length,
    0,
  );

  const out = { source: SOURCE_URL, offices };
  await writeFile(new URL(`${uf}.json`, OUTPUT_DIR), JSON.stringify(out));
  files++;
  total += count;
  console.log(`${uf}: ${count} candidatos`);
}

if (!files) throw new Error("Nenhum arquivo consulta_cand_2026_UF.csv encontrado no ZIP");
console.log(`Pronto: ${total} candidatos em ${files} arquivos (${withCamaraId} com ID da Câmara).`);
