import { useState } from "react";
import { ChevronDown, ChevronRight, DoorOpen, Layers, Square, Box, Armchair } from "lucide-react";
import type { BuildingDocument, EntityRef } from "@react-arch/core";
import { useStudio } from "../store.js";

export function Tree({ doc }: { doc: BuildingDocument }) {
  const { selection, setSelection, setActiveFloor } = useStudio();

  const isSel = (kind: EntityRef["kind"], id: string) =>
    selection?.kind === kind && selection.id === id;

  return (
    <div className="h-full overflow-y-auto text-xs py-2">
      <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-zinc-500">Project</div>
      {doc.buildings.map((b) => (
        <div key={b.id}>
          <div className="flex items-center gap-1.5 px-3 py-1 font-medium text-zinc-200">
            <Layers size={13} className="text-accent" />
            {b.name}
          </div>
          {b.floors.map((f) => (
            <FloorNode
              key={f.id}
              floor={f}
              onSelect={(ref) => {
                setSelection(ref);
                if (ref.kind === "floor") setActiveFloor(ref.id);
              }}
              isSel={isSel}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FloorNode({
  floor,
  onSelect,
  isSel,
}: {
  floor: BuildingDocument["buildings"][number]["floors"][number];
  onSelect: (ref: EntityRef) => void;
  isSel: (kind: EntityRef["kind"], id: string) => boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <Row
        depth={1}
        selected={isSel("floor", floor.id)}
        onClick={() => onSelect({ kind: "floor", id: floor.id })}
        icon={
          <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="text-zinc-500">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        }
        label={floor.name}
        meta={`${floor.elevation}m`}
      />
      {open && (
        <>
          {floor.rooms.map((r) => (
            <Row key={r.id} depth={2} selected={isSel("room", r.id)} onClick={() => onSelect({ kind: "room", id: r.id })}
              icon={<Square size={12} className="text-zinc-500" />} label={r.name} />
          ))}
          {floor.openings.map((o) => (
            <Row key={o.id} depth={2} selected={isSel("opening", o.id)} onClick={() => onSelect({ kind: "opening", id: o.id })}
              icon={<DoorOpen size={12} className="text-zinc-500" />} label={`${o.type} · ${o.width}m`} />
          ))}
          {floor.walls.length > 0 && (
            <Row depth={2} label={`${floor.walls.length} walls`} icon={<Box size={12} className="text-zinc-600" />} muted />
          )}
          {floor.objects.map((ob) => (
            <Row key={ob.id} depth={2} selected={isSel("object", ob.id)} onClick={() => onSelect({ kind: "object", id: ob.id })}
              icon={<Armchair size={12} className="text-zinc-500" />} label={ob.type} />
          ))}
        </>
      )}
    </div>
  );
}

function Row({
  depth,
  label,
  meta,
  icon,
  selected,
  muted,
  onClick,
}: {
  depth: number;
  label: string;
  meta?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ paddingLeft: depth * 14 + 8 }}
      className={`flex items-center gap-1.5 pr-3 py-1 cursor-default ${
        selected ? "bg-accent/20 text-accent" : muted ? "text-zinc-600" : "text-zinc-300 hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="truncate flex-1">{label}</span>
      {meta && <span className="text-[10px] text-zinc-500 font-mono">{meta}</span>}
    </div>
  );
}
