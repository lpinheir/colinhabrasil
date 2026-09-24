import "server-only";

import {
  ELECTION,
  getOffice,
  resolveOffice,
  type OfficeKey,
  type StateCode,
} from "@/config/election";

import type { Candidate } from "@/lib/types";

export type { Candidate };

/** Formato (parcial) de cada item de `/candidatura/listar/.../candidatos`. */
type TseListItem = {
  id: number | string;
  numero: number | string;
  nomeUrna?: string;
  nomeCompleto?: string;
  descricaoSituacao?: string;
  partido?: { sigla?: string; numero?: number | string; nome?: string };
};

type CandidateIndex = Map<string, Candidate>;

// Cache em memória do servidor: uma listagem por (UF, cargo).
// A listagem de deputados de um estado grande pode passar de 2 MB, acima do
// limite do Data Cache do Next.js, por isso o cache é feito aqui.
const TTL_MS = 60 * 60 * 1000; // 1 hora
const cache = new Map<string, { expires: number; data: Promise<CandidateIndex> }>();

function photoUrl(id: string, circunscricao: string) {
  return `${ELECTION.apiBase}/arquivo/img/${ELECTION.electionId}/${id}/${circunscricao}`;
}

async function fetchIndex(circunscricao: string, tseCode: number): Promise<CandidateIndex> {
  const url =
    `${ELECTION.apiBase}/v1/candidatura/listar/${ELECTION.year}/${circunscricao}` +
    `/${ELECTION.electionId}/${tseCode}/candidatos`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; colinha-eleitoral/1.0)",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`TSE respondeu ${res.status} para ${url}`);

  const body = (await res.json()) as { candidatos?: TseListItem[] };
  const index: CandidateIndex = new Map();
  for (const c of body.candidatos ?? []) {
    const number = String(c.numero);
    const id = String(c.id);
    index.set(number, {
      number,
      name: c.nomeUrna || c.nomeCompleto || "",
      party: c.partido?.sigla ?? "",
      // O número do partido são os dois primeiros dígitos do número do candidato.
      partyNumber: c.partido?.numero != null ? String(c.partido.numero) : number.slice(0, 2),
      photoUrl: photoUrl(id, circunscricao),
      status: c.descricaoSituacao,
    });
  }
  return index;
}

function getIndex(circunscricao: string, tseCode: number): Promise<CandidateIndex> {
  const key = `${circunscricao}:${tseCode}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const data = fetchIndex(circunscricao, tseCode);
  cache.set(key, { expires: Date.now() + TTL_MS, data });
  // Não mantém falhas em cache.
  data.catch(() => cache.delete(key));
  return data;
}

export async function getCandidate({
  year,
  state,
  office,
  number,
}: {
  year: number;
  state: StateCode;
  office: OfficeKey;
  number: string;
}): Promise<Candidate | null> {
  if (year !== ELECTION.year) throw new Error(`Ano não suportado: ${year}`);
  const base = getOffice(office);
  if (!base) throw new Error(`Cargo desconhecido: ${office}`);
  const resolved = resolveOffice(base, state);
  if (!new RegExp(`^\\d{${resolved.digits}}$`).test(number)) return null;

  const index = await getIndex(resolved.national ? "BR" : state, resolved.tseCode);
  return index.get(number) ?? null;
}
