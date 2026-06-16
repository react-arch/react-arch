import { useMemo } from "react";
import { allFloors, serialize, type BuildingDocument } from "@react-arch/core";
import { Plan2D } from "@react-arch/renderer-2d";
import { Building3D } from "@react-arch/renderer-3d";
import { useStudio } from "../store.js";
import { resolveFloorView } from "../lib.js";

export function CanvasArea({ doc }: { doc: BuildingDocument }) {
  const s = useStudio();
  const view = resolveFloorView(doc, s.activeFloor, s.floorDisplay);

  const plan = (
    <Plan2D
      document={doc}
      floorIds={view.floorIds}
      ghostFloorIds={view.ghostFloorIds}
      selected={s.selection}
      onSelect={s.setSelection}
      onHover={s.setHovered}
      showGrid={s.showGrid}
      showMeasurements={s.showMeasurements}
    />
  );

  const model3d = (
    <Building3D
      document={doc}
      floorIds={view.floorIds}
      selected={s.selection}
      onSelect={s.setSelection}
      exploded={view.exploded}
      wireframe={s.wireframe}
      xray={s.xray}
      showRoof={s.showRoof}
    />
  );

  switch (s.viewMode) {
    case "2d":
      return <div className="h-full">{plan}</div>;
    case "3d":
      return <div className="h-full">{model3d}</div>;
    case "split":
      return (
        <div className="h-full grid grid-cols-2 divide-x divide-edge">
          <div className="relative">{plan}</div>
          <div className="relative">{model3d}</div>
        </div>
      );
    case "stack":
      return <FloorStack doc={doc} />;
    case "json":
      return <JsonView doc={doc} />;
  }
}

function FloorStack({ doc }: { doc: BuildingDocument }) {
  const { selection, setSelection, showMeasurements } = useStudio();
  // Top floor first.
  const floors = [...allFloors(doc)].sort((a, b) => b.elevation - a.elevation);
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-[#0f1115]">
      {floors.map((f) => (
        <div key={f.id} className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="font-medium text-zinc-200">{f.name}</span>
            <span className="font-mono text-zinc-500">elev {f.elevation} m · {f.rooms.length} rooms</span>
          </div>
          <div className="h-64 rounded-lg border border-edge overflow-hidden">
            <Plan2D
              document={doc}
              floorIds={[f.id]}
              selected={selection}
              onSelect={setSelection}
              showMeasurements={showMeasurements}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function JsonView({ doc }: { doc: BuildingDocument }) {
  const json = useMemo(() => serialize(doc), [doc]);
  return (
    <div className="h-full overflow-auto bg-[#0f1115] p-4">
      <pre className="text-[11px] leading-relaxed font-mono text-zinc-300 whitespace-pre">{json}</pre>
    </div>
  );
}
