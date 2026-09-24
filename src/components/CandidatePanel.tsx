"use client";

import { useEffect, useMemo, useState } from "react";

import type { OfficeKey, StateCode } from "@/config/election";
import { OFFICE_INFO_ORDER, type OfficeInfoKey } from "@/config/offices-info";
import { DataUnavailableError, listCandidates, type ListedCandidate } from "@/lib/candidates";

import { OlhoNaCotaLink } from "./OlhoNaCotaLink";

const PAGE_SIZE = 100;

function officeLabel(office: OfficeInfoKey, state?: StateCode) {
  switch (office) {
    case "DEPUTADO_FEDERAL":
      return "Deputado Federal";
    case "DEPUTADO_ESTADUAL":
      return state === "DF" ? "Deputado Distrital" : "Deputado Estadual";
    case "SENADOR":
      return "Senador";
    case "GOVERNADOR":
      return "Governador";
    case "PRESIDENTE":
      return "Presidente";
  }
}

/** Números da colinha que correspondem a cada cargo da lista. */
function isInColinha(c: ListedCandidate, numbers: Record<OfficeKey, string>) {
  if (c.office === "SENADOR") return numbers.SENADOR_1 === c.number || numbers.SENADOR_2 === c.number;
  return numbers[c.office] === c.number;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Lista neutra de todos os candidatos da UF: ordem por cargo (ordem da urna) e,
 * dentro do cargo, alfabética pelo nome de urna.
 */
export function CandidatePanel({
  state,
  numbers,
  onPick,
}: {
  state?: StateCode;
  numbers: Record<OfficeKey, string>;
  onPick: (candidate: ListedCandidate) => void;
}) {
  const [data, setData] = useState<{ state: StateCode; list: ListedCandidate[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [office, setOffice] = useState<OfficeInfoKey | "">("");
  const [party, setParty] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    setError(null);
    listCandidates(state)
      .then((list) => {
        if (cancelled) return;
        const order = (o: OfficeInfoKey) => OFFICE_INFO_ORDER.indexOf(o);
        list.sort(
          (a, b) => order(a.office) - order(b.office) || a.name.localeCompare(b.name, "pt-BR"),
        );
        setData({ state, list });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof DataUnavailableError
            ? "Os dados do TSE para este estado ainda não foram carregados no site."
            : "Falha ao carregar os candidatos. Verifique sua conexão.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  // Ao trocar de estado, os filtros voltam ao início.
  useEffect(() => {
    setOffice("");
    setParty("");
    setQuery("");
  }, [state]);

  useEffect(() => setLimit(PAGE_SIZE), [state, office, party, query]);

  const list = data && data.state === state ? data.list : null;
  const byOffice = useMemo(
    () => (list ?? []).filter((c) => !office || c.office === office),
    [list, office],
  );
  const parties = useMemo(
    () => [...new Set(byOffice.map((c) => c.party))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [byOffice],
  );
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return byOffice.filter(
      (c) =>
        (!party || c.party === party) &&
        (!q || normalize(c.name).includes(q) || c.number.startsWith(q)),
    );
  }, [byOffice, party, query]);

  return (
    <aside
      aria-label="Lista de candidatos"
      className="no-print flex h-[calc(100dvh-4rem)] flex-col rounded-lg border border-neutral-300 bg-white lg:sticky lg:top-8"
    >
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4">
        <div>
          <h2 className="text-base font-bold">Candidatos {state ? `– ${state}` : ""}</h2>
          <p className="text-xs text-neutral-600">
            Lista completa do TSE, em ordem alfabética. Clique em um candidato para colocá-lo na
            colinha.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Filtrar por cargo"
            value={office}
            onChange={(e) => {
              setOffice(e.target.value as OfficeInfoKey | "");
              setParty("");
            }}
            disabled={!list}
            className="h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm disabled:bg-neutral-100"
          >
            <option value="">Todos os cargos</option>
            {OFFICE_INFO_ORDER.map((o) => (
              <option key={o} value={o}>
                {officeLabel(o, state)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por partido"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            disabled={!list}
            className="h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm disabled:bg-neutral-100"
          >
            <option value="">Todos os partidos</option>
            {parties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="search"
            aria-label="Buscar por nome ou número"
            placeholder="Buscar nome ou número"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!list}
            className="col-span-2 h-10 rounded-md border border-neutral-300 bg-white px-2 text-sm disabled:bg-neutral-100"
          />
        </div>
        {list && (
          <p className="text-xs text-neutral-500" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "candidato" : "candidatos"}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!state ? (
          <Empty>Escolha o estado para ver os candidatos.</Empty>
        ) : error ? (
          <Empty>{error}</Empty>
        ) : !list ? (
          <Empty>Carregando candidatos…</Empty>
        ) : filtered.length === 0 ? (
          <Empty>Nenhum candidato com esses filtros.</Empty>
        ) : (
          <ul>
            {filtered.slice(0, limit).map((c) => (
              <CandidateItem
                key={`${c.office}-${c.number}`}
                candidate={c}
                label={officeLabel(c.office, state)}
                selected={isInColinha(c, numbers)}
                onPick={() => onPick(c)}
              />
            ))}
            {filtered.length > limit && (
              <li className="p-4">
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="h-10 w-full rounded-md border border-neutral-300 text-sm font-semibold hover:bg-neutral-50"
                >
                  Mostrar mais ({filtered.length - limit} restantes)
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}

function CandidateItem({
  candidate,
  label,
  selected,
  onPick,
}: {
  candidate: ListedCandidate;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <li className="flex items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50">
      <button
        type="button"
        onClick={onPick}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 pr-2 text-left"
      >
        {photoFailed ? (
          <span aria-hidden className="h-12 w-9 shrink-0 rounded bg-neutral-100" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.photoUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setPhotoFailed(true)}
            className="h-12 w-9 shrink-0 rounded bg-neutral-100 object-cover"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold uppercase">{candidate.name}</span>
          <span className="block text-xs text-neutral-600">
            {label} · {candidate.party}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-base font-bold tracking-wider">
            {candidate.number}
          </span>
          {selected && <span className="block text-[11px] text-green-700">✓ na colinha</span>}
        </span>
      </button>
      <OlhoNaCotaLink candidate={candidate} className="w-24 shrink-0 pr-4 text-center" />
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-sm text-neutral-500">{children}</p>;
}
