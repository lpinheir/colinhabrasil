import { OFFICE_INFO, OFFICE_INFO_ORDER, type OfficeInfoKey } from "@/config/offices-info";

export function OfficeGuide({
  open,
  onToggle,
  openItem,
  onItemToggle,
}: {
  open: boolean;
  onToggle: () => void;
  openItem: OfficeInfoKey | null;
  onItemToggle: (key: OfficeInfoKey) => void;
}) {
  return (
    <section id="guia-cargos" className="no-print rounded-lg border border-neutral-300 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-base font-bold">O que faz cada cargo?</span>
          <span className="block text-xs text-neutral-600">
            Entenda o papel de quem você vai eleger
          </span>
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="border-t border-neutral-200">
          {OFFICE_INFO_ORDER.map((key) => {
            const info = OFFICE_INFO[key];
            const itemOpen = openItem === key;
            return (
              <div key={key} id={`cargo-${key}`} className="border-b border-neutral-200 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onItemToggle(key)}
                  aria-expanded={itemOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
                >
                  {info.title}
                  <Chevron open={itemOpen} />
                </button>

                {itemOpen && (
                  <div className="flex flex-col gap-3 px-4 pb-4 text-sm leading-relaxed text-neutral-800">
                    <p className="text-xs text-neutral-600">{info.term}</p>

                    <div>
                      <h3 className="font-bold">Função</h3>
                      <p>{info.role}</p>
                    </div>

                    <div>
                      <h3 className="font-bold">Poderes</h3>
                      <ul className="list-disc pl-5">
                        {info.powers.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-md bg-neutral-100 p-3">
                      <h3 className="font-bold">Exemplo real</h3>
                      <p>{info.example}</p>
                    </div>

                    <div>
                      <h3 className="font-bold">O que não faz</h3>
                      <p>{info.notRole}</p>
                    </div>

                    <p className="text-xs text-neutral-500">Base: {info.source}.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden
      className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
      fill="currentColor"
    >
      <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}
