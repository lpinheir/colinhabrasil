"use client";

import { useEffect, useRef, useState } from "react";

import {
  ELECTION,
  OFFICES,
  STATES,
  isStateCode,
  resolveOffice,
  type OfficeKey,
} from "@/config/election";
import { officeInfoKey, type OfficeInfoKey } from "@/config/offices-info";
import { DataUnavailableError, getCandidate } from "@/lib/candidates";

import { Colinha, type Lookup } from "./Colinha";
import { OfficeGuide } from "./OfficeGuide";

const emptyNumbers = Object.fromEntries(OFFICES.map((o) => [o.key, ""])) as Record<OfficeKey, string>;

export function ColinhaApp() {
  const [uf, setUf] = useState("");
  const [numbers, setNumbers] = useState(emptyNumbers);
  const [lookups, setLookups] = useState<Partial<Record<OfficeKey, Lookup>>>({});
  // Última consulta pedida por cargo, para descartar respostas antigas.
  const requested = useRef<Partial<Record<OfficeKey, string>>>({});
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideItem, setGuideItem] = useState<OfficeInfoKey | null>(null);

  function showOfficeInfo(key: OfficeKey) {
    const item = officeInfoKey(key);
    setGuideOpen(true);
    setGuideItem(item);
    requestAnimationFrame(() =>
      document.getElementById(`cargo-${item}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const state = isStateCode(uf) ? uf : undefined;
  const offices = OFFICES.map((o) => (state ? resolveOffice(o, state) : o));

  useEffect(() => {
    for (const office of offices) {
      const number = numbers[office.key];
      const complete = state && number.length === office.digits;
      const key = complete ? `${state}|${number}` : "";
      if (requested.current[office.key] === key) continue;
      requested.current[office.key] = key;

      if (!complete) {
        setLookups((l) => ({ ...l, [office.key]: { status: "idle" } }));
        continue;
      }

      setLookups((l) => ({ ...l, [office.key]: { status: "loading" } }));
      getCandidate({ year: ELECTION.year, state, office: office.key, number })
        .then((candidate): Lookup =>
          candidate ? { status: "found", candidate } : { status: "notfound" },
        )
        .catch(
          (err): Lookup => ({
            status: "error",
            message:
              err instanceof DataUnavailableError
                ? "Os dados do TSE para este estado ainda não foram carregados no site."
                : "Falha ao carregar os dados. Verifique sua conexão e tente de novo.",
          }),
        )
        .then((result) => {
          if (requested.current[office.key] !== key) return;
          setLookups((l) => ({ ...l, [office.key]: result }));
        });
    }
    // `offices` deriva de `state`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, numbers]);

  const sameSenator =
    numbers.SENADOR_1.length === 3 && numbers.SENADOR_1 === numbers.SENADOR_2;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-5">
      <header className="no-print">
        <h1 className="text-2xl font-extrabold tracking-tight">Colinha Eleitoral 2026</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Escolha seu estado e toque nos quadradinhos de cada cargo para digitar o número do
          seu candidato. Os dados vêm do TSE. Nada é salvo.
        </p>
      </header>

      <OfficeGuide
        open={guideOpen}
        onToggle={() => setGuideOpen((o) => !o)}
        openItem={guideItem}
        onItemToggle={(key) => setGuideItem((k) => (k === key ? null : key))}
      />

      <label className="no-print flex flex-col gap-1">
        <span className="text-sm font-semibold">Estado</span>
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="h-12 rounded-lg border border-neutral-300 bg-white px-3 text-base"
        >
          <option value="">Selecione a UF</option>
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </label>

      <Colinha
        stateName={STATES.find((s) => s.code === state)?.name}
        disabled={!state}
        onNumberChange={(key, value) => setNumbers((n) => ({ ...n, [key]: value }))}
        onInfo={showOfficeInfo}
        entries={offices.map((office) => ({
          office,
          number: numbers[office.key],
          lookup: lookups[office.key] ?? { status: "idle" },
          warning:
            office.key === "SENADOR_2" && sameSenator
              ? "Mesmo número nas duas vagas de senador. A urna não aceita votar duas vezes no mesmo candidato."
              : undefined,
        }))}
      />

      <div className="no-print flex flex-col gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="h-12 rounded-lg bg-neutral-900 text-base font-bold uppercase tracking-wide text-white active:bg-neutral-700"
        >
          Imprimir colinha
        </button>
        <p className="text-xs text-neutral-600">
          No celular, você também pode tirar um print da colinha acima. Atenção: é proibido
          usar o celular na cabine de votação, então consulte antes de entrar ou leve a colinha
          em papel.
        </p>
        <p className="text-xs text-neutral-500">
          Ferramenta neutra e sem vínculo com partidos ou candidatos. Exibe apenas os números
          digitados por você, com dados públicos do TSE (DivulgaCandContas).
        </p>
      </div>
    </div>
  );
}
