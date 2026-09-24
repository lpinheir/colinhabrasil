import type { Office } from "@/config/election";
import type { Candidate } from "@/lib/types";

export type ColinhaEntry = {
  office: Office;
  number: string;
  candidate?: Candidate;
};

export function Colinha({
  stateName,
  entries,
}: {
  stateName?: string;
  entries: ColinhaEntry[];
}) {
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
      <ol>
        {entries.map((entry) => (
          <ColinhaRow key={entry.office.key} {...entry} />
        ))}
      </ol>
      <footer className="border-t border-neutral-300 px-4 py-1.5 text-center text-[10px] text-neutral-500">
        1º turno · 4 de outubro de 2026 · Dados: TSE / DivulgaCandContas
      </footer>
    </section>
  );
}

function ColinhaRow({ office, number, candidate }: ColinhaEntry) {
  const digits = Array.from({ length: office.digits }, (_, i) => number[i] ?? "");

  return (
    <li className="colinha-row flex items-center gap-3 border-b border-neutral-300 px-4 py-2.5 last:border-b-0">
      <Photo candidate={candidate} />

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-600">
          {office.label}
        </p>
        <div className="mt-1 flex gap-1">
          {digits.map((d, i) => (
            <span
              key={i}
              className="digit-box flex h-9 w-7 items-center justify-center rounded border-2 border-neutral-900 bg-white font-mono text-xl font-bold"
            >
              {d}
            </span>
          ))}
        </div>
        <p className="mt-1 line-clamp-2 break-words text-sm font-bold uppercase leading-tight">
          {candidate?.name ?? " "}
        </p>
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

function Photo({ candidate }: { candidate?: Candidate }) {
  if (!candidate) {
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
      className="photo h-[72px] w-14 shrink-0 rounded border border-neutral-300 bg-neutral-100 object-cover"
    />
  );
}
