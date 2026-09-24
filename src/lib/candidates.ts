import {
  ELECTION,
  getOffice,
  resolveOffice,
  type OfficeKey,
  type StateCode,
} from "@/config/election";
import type { OfficeInfoKey } from "@/config/offices-info";
import type { Candidate } from "@/lib/types";

type Row = [name: string, party: string, partyNumber: string, id: string, status: string];

/** Formato de public/data/candidatos/{UF}.json (ver scripts/sync-tse.mjs). */
type StateFile = {
  offices: Record<string, Record<string, Row>>;
};

function toCandidate(row: Row, number: string, circunscricao: string): Candidate {
  const [name, party, partyNumber, id, status] = row;
  return {
    number,
    name,
    party,
    partyNumber,
    photoUrl: `${ELECTION.photoBase}/${ELECTION.electionId}/${id}/${circunscricao}`,
    status: status || undefined,
  };
}

export class DataUnavailableError extends Error {}

// Um arquivo por UF, baixado uma vez por visita e reaproveitado em todas as buscas.
const files = new Map<string, Promise<StateFile>>();

function loadStateFile(circunscricao: string): Promise<StateFile> {
  let file = files.get(circunscricao);
  if (!file) {
    file = fetch(`${ELECTION.dataPath}/${circunscricao}.json`).then((res) => {
      if (res.status === 404) throw new DataUnavailableError(circunscricao);
      if (!res.ok) throw new Error(`Erro ${res.status} ao carregar ${circunscricao}`);
      return res.json() as Promise<StateFile>;
    });
    files.set(circunscricao, file);
    // Não guarda falhas, para tentar de novo na próxima busca.
    file.catch(() => files.delete(circunscricao));
  }
  return file;
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

  // Presidente está no arquivo nacional (BR).
  const circunscricao = resolved.national ? "BR" : state;
  const file = await loadStateFile(circunscricao);
  const row = file.offices[String(resolved.tseCode)]?.[number];
  return row ? toCandidate(row, number, circunscricao) : null;
}

export type ListedCandidate = Candidate & { office: OfficeInfoKey };

const OFFICE_BY_TSE_CODE: Record<string, OfficeInfoKey> = {
  "1": "PRESIDENTE",
  "3": "GOVERNADOR",
  "5": "SENADOR",
  "6": "DEPUTADO_FEDERAL",
  "7": "DEPUTADO_ESTADUAL",
  "8": "DEPUTADO_ESTADUAL",
};

/** Todos os candidatos que o eleitor da UF pode escolher, incluindo presidente. */
export async function listCandidates(state: StateCode): Promise<ListedCandidate[]> {
  const [stateFile, national] = await Promise.all([loadStateFile(state), loadStateFile("BR")]);
  const list: ListedCandidate[] = [];
  for (const [circunscricao, file] of [[state, stateFile], ["BR", national]] as const) {
    for (const [code, rows] of Object.entries(file.offices)) {
      const office = OFFICE_BY_TSE_CODE[code];
      if (!office || (circunscricao === "BR") !== (office === "PRESIDENTE")) continue;
      for (const [number, row] of Object.entries(rows)) {
        list.push({ ...toCandidate(row, number, circunscricao), office });
      }
    }
  }
  return list;
}
