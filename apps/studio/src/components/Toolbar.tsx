import { useState } from "react";
import {
  Box,
  Boxes,
  Braces,
  Columns2,
  Download,
  Eye,
  Grid3x3,
  Layers,
  Ruler,
  SquareDashed,
  Square,
} from "lucide-react";
import type { BuildingComposition } from "@react-arch/react";
import { allFloors, type BuildingDocument } from "@react-arch/core";
import { exportJSON, exportSVG, exportGLTF } from "@react-arch/exporters";
import { useStudio, type FloorDisplay, type ViewMode } from "../store.js";
import { download } from "../lib.js";

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "2d", label: "2D Plan", icon: <Square size={14} /> },
  { id: "3d", label: "3D", icon: <Box size={14} /> },
  { id: "split", label: "Split", icon: <Columns2 size={14} /> },
  { id: "stack", label: "Stack", icon: <Boxes size={14} /> },
  { id: "json", label: "JSON", icon: <Braces size={14} /> },
];

export function Toolbar({
  doc,
  compositions,
}: {
  doc: BuildingDocument;
  compositions: BuildingComposition[];
}) {
  const s = useStudio();
  const [exporting, setExporting] = useState(false);
  const floors = allFloors(doc);

  // Which controls make sense for the active view.
  const is3D = s.viewMode === "3d" || s.viewMode === "split";
  const is2D = s.viewMode === "2d" || s.viewMode === "split";
  const showFloorNav = is2D || is3D; // not stack (all floors) / not json
  const showMeasurements = is2D || s.viewMode === "stack";

  const displayOptions: { v: FloorDisplay; label: string }[] = [
    { v: "all", label: "Full building" },
    { v: "isolated", label: "Isolated floor" },
    ...(is2D ? [{ v: "ghost" as const, label: "Ghost floors" }] : []),
    ...(is3D ? [{ v: "exploded" as const, label: "Exploded" }] : []),
  ];

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

  const hasToggles = is2D || showMeasurements || is3D;

  return (
    <div className="flex items-center gap-3 px-3 h-11 border-b border-edge bg-panel select-none">
      <div className="flex items-center gap-2 pr-3 border-r border-edge">
        <Layers size={16} className="text-accent" />
        <span className="font-semibold tracking-tight">React Arch</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 bg-panel2 px-1.5 py-0.5 rounded">
          Studio
        </span>
      </div>

      {/* Composition selector — always relevant */}
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

      {/* View modes — always relevant */}
      <div className="flex items-center gap-0.5 bg-panel2 rounded p-0.5 border border-edge">
        {VIEW_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => s.setViewMode(m.id)}
            title={m.label}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
              s.viewMode === m.id ? "bg-accent text-white" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {m.icon}
            <span className="hidden lg:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Floor navigation — hidden for Stack (all floors) and JSON */}
      {showFloorNav && (
        <div className="flex items-center gap-2 pl-3 border-l border-edge">
          <select
            className="bg-panel2 border border-edge rounded px-2 py-1 text-xs outline-none focus:border-accent"
            value={s.activeFloor}
            onChange={(e) => s.setActiveFloor(e.target.value)}
          >
            <option value="all">All Floors</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <select
            className="bg-panel2 border border-edge rounded px-2 py-1 text-xs outline-none focus:border-accent"
            value={s.floorDisplay}
            onChange={(e) => s.setFloorDisplay(e.target.value as FloorDisplay)}
            title="Floor display mode"
          >
            {displayOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1" />

      {/* Display toggles — only those the active renderer supports */}
      {hasToggles && (
        <div className="flex items-center gap-1 pr-3 border-r border-edge">
          {is2D && (
            <ToggleButton active={s.showGrid} onClick={() => s.toggle("showGrid")} title="Grid">
              <Grid3x3 size={14} />
            </ToggleButton>
          )}
          {showMeasurements && (
            <ToggleButton active={s.showMeasurements} onClick={() => s.toggle("showMeasurements")} title="Measurements">
              <Ruler size={14} />
            </ToggleButton>
          )}
          {is3D && (
            <ToggleButton active={s.wireframe} onClick={() => s.toggle("wireframe")} title="Wireframe">
              <SquareDashed size={14} />
            </ToggleButton>
          )}
          {is3D && (
            <ToggleButton active={s.xray} onClick={() => s.toggle("xray")} title="X-ray">
              <Eye size={14} />
            </ToggleButton>
          )}
        </div>
      )}

      {/* Export — always available */}
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

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded border transition-colors ${
        active ? "bg-accent/20 border-accent text-accent" : "bg-panel2 border-edge text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}
