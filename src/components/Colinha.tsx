import { useRef, useState } from "react";

import type { Office, OfficeKey } from "@/config/election";
import type { Candidate } from "@/lib/types";

export type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; candidate: Candidate }
  | { status: "notfound" }
  | { status: "error"; message: string };

export type ColinhaEntry = {
  office: Office;
  number: string;
  lookup: Lookup;
  warning?: string;
};

/** Colinha editável: os quadradinhos de cada cargo são o próprio campo de digitação. */
export function Colinha({
  stateName,
  entries,
  disabled,
  onNumberChange,
  onInfo,
}: {
  stateName?: string;
  entries: ColinhaEntry[];
  disabled: boolean;
  onNumberChange: (key: OfficeKey, value: string) => void;
  onInfo: (key: OfficeKey) => void;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <section
      id="colinha"
      aria-label="Colinha eleitoral"
      className="colinha mx-auto w-full max-w-md rounded-lg border border-neutral-300 bg-white text-neutral-900 shadow-sm"
    >
      <header className="flex items-baseline justify-between border-b-2 border-neutral-900 px-4 py-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">Colinha eleitoral 2026</h2>
        <span className="text-xs font-semibold uppercase text-neutral-600">
          {stateName ?? "UF não selecionada"}
        </span>
      </header>
      {disabled && (
        <p className="no-print bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Escolha o estado acima para começar a digitar os números.
        </p>
      )}
      <ol>
        {entries.map((entry, i) => (
          <ColinhaRow
            key={entry.office.key}
            {...entry}
            disabled={disabled}
            inputRef={(el) => {
              inputs.current[i] = el;
            }}
            onChange={(value) => {
              onNumberChange(entry.office.key, value);
              // Número completo: pula para o próximo cargo.
              if (value.length === entry.office.digits && entry.number.length < value.length) {
                inputs.current[i + 1]?.focus();
              }
            }}
            onInfo={() => onInfo(entry.office.key)}
          />
        ))}
      </ol>
      <footer className="border-t border-neutral-300 px-4 py-1.5 text-center text-[10px] text-neutral-500">
        1º turno · 4 de outubro de 2026 · Dados: TSE
      </footer>
    </section>
  );
}

function ColinhaRow({
  office,
  number,
  lookup,
  warning,
  disabled,
  inputRef,
  onChange,
  onInfo,
}: ColinhaEntry & {
  disabled: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onInfo: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const candidate = lookup.status === "found" ? lookup.candidate : undefined;
  const digits = Array.from({ length: office.digits }, (_, i) => number[i] ?? "");
  const activeBox = Math.min(number.length, office.digits - 1);

  return (
    <li
      className={`colinha-row flex items-center gap-3 border-b border-neutral-300 px-4 py-2.5 last:border-b-0 ${
        disabled ? "" : "cursor-text"
      } ${focused ? "bg-neutral-50" : ""}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button")) input.current?.focus();
      }}
    >
      <Photo candidate={candidate} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-600">
            {office.label}
          </p>
          <button
            type="button"
            onClick={onInfo}
            aria-label={`O que faz o cargo de ${office.label}?`}
            className="no-print flex h-5 w-5 items-center justify-center rounded-full border border-neutral-400 text-[10px] font-bold text-neutral-500"
          >
            ?
          </button>
        </div>

        <div className="relative mt-1 inline-flex gap-1">
          {digits.map((d, i) => (
            <span
              key={i}
              aria-hidden
              className={`digit-box flex h-9 w-7 items-center justify-center rounded border-2 bg-white font-mono text-xl font-bold ${
                focused && i === activeBox && number.length < office.digits
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-neutral-900"
              }`}
            >
              {d}
            </span>
          ))}
          <input
            ref={(el) => {
              input.current = el;
              inputRef(el);
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label={`Número para ${office.label} (${office.digits} dígitos)`}
            maxLength={office.digits}
            disabled={disabled}
            value={number}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, office.digits))}
            className="no-print absolute inset-0 h-full w-full cursor-text text-base opacity-0 disabled:cursor-not-allowed"
          />
        </div>

        <p className="mt-1 line-clamp-2 break-words text-sm font-bold uppercase leading-tight">
          {candidate?.name ?? " "}
        </p>
        <RowStatus lookup={lookup} warning={warning} />
      </div>

      <div className="max-w-24 shrink-0 self-start pt-4 text-right">
        {candidate && (
          <>
            <p className="text-[11px] font-bold uppercase leading-tight [overflow-wrap:anywhere]">
              {candidate.party}
            </p>
            <p className="text-xs text-neutral-600">{candidate.partyNumber}</p>
          </>
        )}
      </div>
    </li>
  );
}

function RowStatus({ lookup, warning }: { lookup: Lookup; warning?: string }) {
  let content: React.ReactNode = null;
  if (lookup.status === "loading") {
    content = (
      <span className="flex items-center gap-1.5 text-neutral-600">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
        Buscando…
      </span>
    );
  } else if (lookup.status === "notfound") {
    content = <span className="text-red-700">Nenhum candidato encontrado</span>;
  } else if (lookup.status === "error") {
    content = <span className="text-red-700">{lookup.message}</span>;
  }

  if (!content && !warning) return null;
  return (
    <div className="no-print mt-0.5 text-xs" aria-live="polite">
      {content}
      {warning && <span className="block text-amber-700">{warning}</span>}
    </div>
  );
}

function Photo({ candidate }: { candidate?: Candidate }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!candidate || failedUrl === candidate.photoUrl) {
    return (
      <div
        aria-hidden
        className="photo flex h-[72px] w-14 shrink-0 items-center justify-center rounded border border-neutral-300 bg-neutral-100 text-neutral-300"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidate.photoUrl}
      alt={`Foto de ${candidate.name}`}
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(candidate.photoUrl)}
      className="photo h-[72px] w-14 shrink-0 rounded border border-neutral-300 bg-neutral-100 object-cover"
    />
  );
}
