/**
 * Configuração da eleição geral de 2026.
 *
 * Fonte de dados: arquivo oficial de candidatos do TSE
 *   https://dadosabertos.tse.jus.br/dataset/candidatos-2026
 * espelhado em public/data/candidatos/{UF}.json por scripts/sync-tse.mjs.
 *
 * - ID da eleição geral de 2026 no DivulgaCandContas (usado nas fotos):
 *   20322002026.
 * - Códigos de cargo do TSE: 1 Presidente, 3 Governador, 5 Senador,
 *   6 Deputado Federal, 7 Deputado Estadual, 8 Deputado Distrital.
 *
 * Quantidade de dígitos (Lei nº 9.504/1997, art. 15, e resolução do TSE
 * sobre registro de candidaturas):
 * - Presidente e Governador: 2 dígitos (número do partido)
 * - Senador: 3 dígitos (número do partido + 1)
 * - Deputado Federal: 4 dígitos (número do partido + 2)
 * - Deputado Estadual/Distrital: 5 dígitos (número do partido + 3)
 *
 * Em 2026 há renovação de 2/3 do Senado: cada eleitor vota em DOIS senadores.
 * A ordem abaixo segue a ordem de votação na urna.
 */

export const ELECTION = {
  year: 2026,
  electionId: "20322002026",
  photoBase: "https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img",
  dataPath: "/data/candidatos",
} as const;

export type OfficeKey =
  | "DEPUTADO_FEDERAL"
  | "DEPUTADO_ESTADUAL"
  | "SENADOR_1"
  | "SENADOR_2"
  | "GOVERNADOR"
  | "PRESIDENTE";

export type Office = {
  key: OfficeKey;
  label: string;
  /** Código do cargo no TSE. */
  tseCode: number;
  digits: number;
  /** Presidente é buscado na circunscrição nacional ("BR"). */
  national?: boolean;
};

export const OFFICES: readonly Office[] = [
  { key: "DEPUTADO_FEDERAL", label: "Deputado Federal", tseCode: 6, digits: 4 },
  { key: "DEPUTADO_ESTADUAL", label: "Deputado Estadual", tseCode: 7, digits: 5 },
  { key: "SENADOR_1", label: "Senador – 1ª vaga", tseCode: 5, digits: 3 },
  { key: "SENADOR_2", label: "Senador – 2ª vaga", tseCode: 5, digits: 3 },
  { key: "GOVERNADOR", label: "Governador", tseCode: 3, digits: 2 },
  { key: "PRESIDENTE", label: "Presidente", tseCode: 1, digits: 2, national: true },
];

/** No DF não há deputado estadual: o cargo é deputado distrital (código 8). */
export function resolveOffice(office: Office, state: StateCode): Office {
  if (office.key === "DEPUTADO_ESTADUAL" && state === "DF") {
    return { ...office, label: "Deputado Distrital", tseCode: 8 };
  }
  return office;
}

export function getOffice(key: string): Office | undefined {
  return OFFICES.find((o) => o.key === key);
}

export const STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
] as const;

export type StateCode = (typeof STATES)[number]["code"];

export function isStateCode(value: string): value is StateCode {
  return STATES.some((s) => s.code === value);
}
