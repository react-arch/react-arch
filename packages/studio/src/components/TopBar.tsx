import { useState } from "react";
import { Download } from "lucide-react";
import { Mark } from "../Mark.js";
import type { BuildingComposition } from "@react-arch/react";
import type { BuildingDocument } from "@react-arch/core";
import { exportJSON, exportSVG, exportGLTF } from "@react-arch/exporters";
import { useStudio } from "../store.js";
import { download } from "../lib.js";

export function TopBar({
  doc,
  compositions,
}: {
  doc: BuildingDocument;
  compositions: BuildingComposition[];
}) {
  const s = useStudio();
  const [exporting, setExporting] = useState(false);

  const onExport = async (kind: "json" | "svg" | "glb") => {
    try {
      setExporting(true);
      const base = doc.name.replace(/\s+/g, "-").toLowerCase();
      if (kind === "json") download(`${base}.json`, exportJSON(doc), "application/json");
      else if (kind === "svg") download(`${base}.svg`, exportSVG(doc), "image/svg+xml");
      else {
        const glb = await exportGLTF(doc, { binary: true });
        download(`${base}.glb`, glb as ArrayBuffer, "model/gltf-binary");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 h-11 border-b border-edge bg-panel select-none">
      <div className="flex items-center gap-2">
        <Mark size={18} />
        <span className="font-semibold tracking-tight">React Arch</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 bg-panel2 px-1.5 py-0.5 rounded">
          Studio
        </span>
      </div>

      {compositions.length > 1 && (
        <select
          className="bg-panel2 border border-edge rounded px-2 py-1 text-xs outline-none focus:border-accent"
          value={s.compositionId ?? ""}
          onChange={(e) => s.setComposition(e.target.value)}
        >
          {compositions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {compositions.length === 1 && (
        <span className="text-xs text-zinc-300">{compositions[0]!.name}</span>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <span className="text-zinc-500 mr-1" title="Export">
          <Download size={14} />
        </span>
        {(["json", "svg", "glb"] as const).map((k) => (
          <button
            key={k}
            disabled={exporting}
            onClick={() => onExport(k)}
            className="px-2 py-1 text-[11px] uppercase tracking-wide rounded bg-panel2 border border-edge hover:border-accent disabled:opacity-50"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
