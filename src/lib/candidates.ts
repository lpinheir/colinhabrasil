import {
  ELECTION,
  getOffice,
  resolveOffice,
  type OfficeKey,
  type StateCode,
} from "@/config/election";
import type { Candidate } from "@/lib/types";

/** Formato de public/data/candidatos/{UF}.json (ver scripts/sync-tse.mjs). */
type StateFile = {
  offices: Record<string, Record<string, [name: string, party: string, partyNumber: string, id: string, status: string]>>;
};

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
  if (!row) return null;

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
