"use client";

import { useEffect, useRef, useState } from "react";

import {
  OFFICES,
  STATES,
  isStateCode,
  resolveOffice,
  type OfficeKey,
} from "@/config/election";
import type { Candidate } from "@/lib/types";

import { Colinha } from "./Colinha";

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; candidate: Candidate }
  | { status: "notfound" }
  | { status: "error"; message: string };

const emptyNumbers = Object.fromEntries(OFFICES.map((o) => [o.key, ""])) as Record<OfficeKey, string>;

export function ColinhaApp() {
  const [uf, setUf] = useState("");
  const [numbers, setNumbers] = useState(emptyNumbers);
  const [lookups, setLookups] = useState<Partial<Record<OfficeKey, Lookup>>>({});
  // Última consulta pedida por cargo, para descartar respostas antigas.
  const requested = useRef<Partial<Record<OfficeKey, string>>>({});

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
      const qs = new URLSearchParams({ uf: state, cargo: office.key, numero: number });
      fetch(`/api/candidato?${qs}`)
        .then(async (res): Promise<Lookup> => {
          if (res.status === 404) return { status: "notfound" };
          const body = await res.json();
          if (!res.ok) return { status: "error", message: body.error ?? "Erro na consulta" };
          return { status: "found", candidate: body.candidate };
        })
        .catch((): Lookup => ({ status: "error", message: "Falha de conexão" }))
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
          Escolha seu estado e digite os números dos seus candidatos. Os dados vêm do TSE.
          Nada é salvo.
        </p>
      </header>

      <form className="no-print flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <label className="flex flex-col gap-1">
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

        {offices.map((office) => (
          <NumberField
            key={office.key}
            label={office.label}
            digits={office.digits}
            value={numbers[office.key]}
            disabled={!state}
            lookup={lookups[office.key] ?? { status: "idle" }}
            onChange={(value) => setNumbers((n) => ({ ...n, [office.key]: value }))}
            warning={
              office.key === "SENADOR_2" && sameSenator
                ? "O mesmo número foi informado nas duas vagas de senador. A urna não aceita votar duas vezes no mesmo candidato."
                : undefined
            }
          />
        ))}
      </form>

      <Colinha
        stateName={STATES.find((s) => s.code === state)?.name}
        entries={offices.map((office) => {
          const lookup = lookups[office.key];
          return {
            office,
            number: numbers[office.key],
            candidate: lookup?.status === "found" ? lookup.candidate : undefined,
          };
        })}
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

function NumberField({
  label,
  digits,
  value,
  disabled,
  lookup,
  onChange,
  warning,
}: {
  label: string;
  digits: number;
  value: string;
  disabled: boolean;
  lookup: Lookup;
  onChange: (value: string) => void;
  warning?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">
        {label} <span className="font-normal text-neutral-500">({digits} dígitos)</span>
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={digits}
        placeholder={disabled ? "Selecione a UF primeiro" : "0".repeat(digits)}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, digits))}
        className="h-12 rounded-lg border border-neutral-300 bg-white px-3 font-mono text-xl tracking-[0.3em] disabled:bg-neutral-100 disabled:text-base disabled:tracking-normal"
      />
      <LookupStatus lookup={lookup} />
      {warning && <span className="text-sm text-amber-700">{warning}</span>}
    </label>
  );
}

function LookupStatus({ lookup }: { lookup: Lookup }) {
  switch (lookup.status) {
    case "loading":
      return (
        <span className="flex items-center gap-2 text-sm text-neutral-600" aria-live="polite">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          Buscando no TSE…
        </span>
      );
    case "found":
      return (
        <span className="text-sm text-green-700" aria-live="polite">
          ✓ Candidato encontrado: <strong>{lookup.candidate.name}</strong> ({lookup.candidate.party})
          {lookup.candidate.status && (
            <span className="block text-xs text-neutral-500">
              Situação no TSE: {lookup.candidate.status}
            </span>
          )}
        </span>
      );
    case "notfound":
      return (
        <span className="text-sm text-red-700" aria-live="polite">
          Nenhum candidato encontrado
        </span>
      );
    case "error":
      return (
        <span className="text-sm text-red-700" aria-live="polite">
          {lookup.message}
        </span>
      );
    default:
      return null;
  }
}
