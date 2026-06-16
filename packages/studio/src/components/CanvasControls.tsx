import { Box, Boxes, Braces, Columns2, Eye, Grid3x3, Home, Ruler, SquareDashed, Square } from "lucide-react";
import { allFloors, type BuildingDocument } from "@react-arch/core";
import { useStudio, type FloorDisplay, type ViewMode } from "../store.js";

const VIEW_MODES: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "2d", label: "2D Plan", icon: <Square size={14} /> },
  { id: "3d", label: "3D", icon: <Box size={14} /> },
  { id: "split", label: "Split", icon: <Columns2 size={14} /> },
  { id: "stack", label: "Stack", icon: <Boxes size={14} /> },
  { id: "json", label: "JSON", icon: <Braces size={14} /> },
];

const PANEL = "bg-panel/90 backdrop-blur-sm border border-edge rounded-lg shadow-lg shadow-black/30";

/** Controls that float over the canvas, contextual to the active view. */
export function CanvasControls({ doc }: { doc: BuildingDocument }) {
  const s = useStudio();
  const floors = allFloors(doc);

  const is3D = s.viewMode === "3d" || s.viewMode === "split";
  const is2D = s.viewMode === "2d" || s.viewMode === "split";
  const showFloorNav = is2D || is3D;
  const showMeasurements = is2D || s.viewMode === "stack";
  const hasToggles = is2D || showMeasurements || is3D;

  const displayOptions: { v: FloorDisplay; label: string }[] = [
    { v: "all", label: "Full building" },
    { v: "isolated", label: "Isolated floor" },
    ...(is2D ? [{ v: "ghost" as const, label: "Ghost floors" }] : []),
    ...(is3D ? [{ v: "exploded" as const, label: "Exploded" }] : []),
  ];

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2 pointer-events-none">
      {/* View modes */}
      <div className={`pointer-events-auto flex items-center gap-0.5 p-0.5 ${PANEL}`}>
        {VIEW_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => s.setViewMode(m.id)}
            title={m.label}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
              s.viewMode === m.id ? "bg-accent text-white" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {m.icon}
            <span className="hidden xl:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Floor navigation + display toggles */}
      {(showFloorNav || hasToggles) && (
        <div className={`pointer-events-auto flex items-center gap-2 px-2 py-1.5 ${PANEL}`}>
          {showFloorNav && (
            <>
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
            </>
          )}

          {hasToggles && (
            <div className="flex items-center gap-1 pl-1 border-l border-edge">
              {is2D && (
                <Toggle active={s.showGrid} onClick={() => s.toggle("showGrid")} title="Grid">
                  <Grid3x3 size={14} />
                </Toggle>
              )}
              {showMeasurements && (
                <Toggle active={s.showMeasurements} onClick={() => s.toggle("showMeasurements")} title="Measurements">
                  <Ruler size={14} />
                </Toggle>
              )}
              {is3D && (
                <Toggle active={s.wireframe} onClick={() => s.toggle("wireframe")} title="Wireframe">
                  <SquareDashed size={14} />
                </Toggle>
              )}
              {is3D && (
                <Toggle active={s.xray} onClick={() => s.toggle("xray")} title="X-ray">
                  <Eye size={14} />
                </Toggle>
              )}
              {is3D && (
                <Toggle active={s.showRoof} onClick={() => s.toggle("showRoof")} title="Roof">
                  <Home size={14} />
                </Toggle>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({
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
