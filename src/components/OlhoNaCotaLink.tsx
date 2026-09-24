import { olhoNaCotaUrl } from "@/lib/olho-na-cota";
import type { Candidate } from "@/lib/types";

export function OlhoNaCotaLink({
  candidate,
  className = "",
}: {
  candidate: Pick<Candidate, "name" | "camaraId">;
  className?: string;
}) {
  return (
    <a
      href={olhoNaCotaUrl(candidate)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Ver ${candidate.name} no Olho na Cota (abre em nova aba)`}
      className={`no-print text-[11px] font-semibold leading-tight text-blue-700 underline underline-offset-2 hover:text-blue-900 ${className}`}
    >
      Ver no Olho na Cota ↗
    </a>
  );
}
