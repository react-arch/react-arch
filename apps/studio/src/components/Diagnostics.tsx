import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Diagnostic } from "@react-arch/validation";
import { useStudio } from "../store.js";

const ICON = {
  error: <AlertCircle size={13} className="text-red-400" />,
  warning: <AlertTriangle size={13} className="text-amber-400" />,
  info: <Info size={13} className="text-sky-400" />,
};

export function Diagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  const { setSelection } = useStudio();
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-3 h-7 border-b border-edge text-[11px] text-zinc-400">
        <span className="uppercase tracking-wider text-zinc-500">Diagnostics</span>
        <span className="flex items-center gap-1"><AlertCircle size={12} className="text-red-400" /> {errors}</span>
        <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-400" /> {warnings}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {diagnostics.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 text-emerald-400 text-xs">
            <CheckCircle2 size={13} /> No problems. Model is valid.
          </div>
        )}
        {diagnostics.map((d, i) => (
          <button
            key={i}
            onClick={() => d.entityId && setSelection(guessKind(d, d.entityId))}
            className="flex items-start gap-2 w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 border-b border-edge/40"
          >
            {ICON[d.severity]}
            <span className="flex-1 text-zinc-300">{d.message}</span>
            <span className="font-mono text-[10px] text-zinc-600">{d.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function guessKind(d: Diagnostic, id: string) {
  // Best-effort: map common codes to entity kinds for selection.
  if (d.code.includes("wall")) return { kind: "wall" as const, id };
  if (d.code.includes("room")) return { kind: "room" as const, id };
  if (d.code.includes("opening")) return { kind: "opening" as const, id };
  if (d.code.includes("floor")) return { kind: "floor" as const, id };
  return { kind: "room" as const, id };
}
