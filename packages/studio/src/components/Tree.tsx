import { useState } from "react";
import { ChevronDown, ChevronRight, DoorOpen, Layers, Square, Box, Armchair } from "lucide-react";
import type { BuildingDocument, EntityRef, Floor, Opening, BuildingObject } from "@react-arch/core";
import { pointInPolygon } from "@react-arch/geometry";
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

/** Group a floor's openings and objects under the room they belong to. */
function groupByRoom(floor: Floor) {
  const roomOfWall = new Map<string, string>();
  for (const r of floor.rooms) {
    for (const wid of r.boundaryWallIds ?? []) {
      if (!roomOfWall.has(wid)) roomOfWall.set(wid, r.id);
    }
  }
  const openings = new Map<string, Opening[]>();
  const objects = new Map<string, BuildingObject[]>();
  const orphanOpenings: Opening[] = [];
  const orphanObjects: BuildingObject[] = [];

  const push = <T,>(map: Map<string, T[]>, key: string, value: T) => {
    const arr = map.get(key);
    if (arr) arr.push(value);
    else map.set(key, [value]);
  };

  for (const o of floor.openings) {
    const roomId = roomOfWall.get(o.wallId);
    if (roomId) push(openings, roomId, o);
    else orphanOpenings.push(o);
  }
  for (const ob of floor.objects) {
    const room = floor.rooms.find((r) =>
      pointInPolygon([ob.position[0], ob.position[1]], r.polygon),
    );
    if (room) push(objects, room.id, ob);
    else orphanObjects.push(ob);
  }
  return { openings, objects, orphanOpenings, orphanObjects };
}

function FloorNode({
  floor,
  onSelect,
  isSel,
}: {
  floor: Floor;
  onSelect: (ref: EntityRef) => void;
  isSel: (kind: EntityRef["kind"], id: string) => boolean;
}) {
  const [open, setOpen] = useState(true);
  const grouped = groupByRoom(floor);

  return (
    <div>
      <Row
        depth={1}
        selected={isSel("floor", floor.id)}
        onClick={() => onSelect({ kind: "floor", id: floor.id })}
        caret={open}
        onToggle={() => setOpen((o) => !o)}
        label={floor.name}
        meta={`${floor.elevation}m`}
      />
      {open && (
        <>
          {floor.rooms.map((r) => (
            <RoomNode
              key={r.id}
              room={r}
              openings={grouped.openings.get(r.id) ?? []}
              objects={grouped.objects.get(r.id) ?? []}
              onSelect={onSelect}
              isSel={isSel}
            />
          ))}

          {grouped.orphanOpenings.map((o) => (
            <OpeningRow key={o.id} depth={2} opening={o} onSelect={onSelect} isSel={isSel} />
          ))}
          {grouped.orphanObjects.map((ob) => (
            <ObjectRow key={ob.id} depth={2} obj={ob} onSelect={onSelect} isSel={isSel} />
          ))}
          {floor.walls.length > 0 && (
            <Row depth={2} label={`${floor.walls.length} walls`} icon={<Box size={12} className="text-zinc-600" />} muted />
          )}
        </>
      )}
    </div>
  );
}

function RoomNode({
  room,
  openings,
  objects,
  onSelect,
  isSel,
}: {
  room: Floor["rooms"][number];
  openings: Opening[];
  objects: BuildingObject[];
  onSelect: (ref: EntityRef) => void;
  isSel: (kind: EntityRef["kind"], id: string) => boolean;
}) {
  const [open, setOpen] = useState(true);
  const childCount = openings.length + objects.length;
  return (
    <div>
      <Row
        depth={2}
        selected={isSel("room", room.id)}
        onClick={() => onSelect({ kind: "room", id: room.id })}
        caret={childCount > 0 ? open : undefined}
        onToggle={childCount > 0 ? () => setOpen((o) => !o) : undefined}
        icon={<Square size={12} className="text-zinc-500" />}
        label={room.name}
        meta={childCount > 0 ? `${childCount}` : undefined}
      />
      {open && (
        <>
          {openings.map((o) => (
            <OpeningRow key={o.id} depth={3} opening={o} onSelect={onSelect} isSel={isSel} />
          ))}
          {objects.map((ob) => (
            <ObjectRow key={ob.id} depth={3} obj={ob} onSelect={onSelect} isSel={isSel} />
          ))}
        </>
      )}
    </div>
  );
}

function OpeningRow({ depth, opening, onSelect, isSel }: {
  depth: number; opening: Opening; onSelect: (ref: EntityRef) => void; isSel: (k: EntityRef["kind"], id: string) => boolean;
}) {
  return (
    <Row depth={depth} selected={isSel("opening", opening.id)} onClick={() => onSelect({ kind: "opening", id: opening.id })}
      icon={<DoorOpen size={12} className="text-zinc-500" />} label={opening.type} meta={`${opening.width}m`} />
  );
}

function ObjectRow({ depth, obj, onSelect, isSel }: {
  depth: number; obj: BuildingObject; onSelect: (ref: EntityRef) => void; isSel: (k: EntityRef["kind"], id: string) => boolean;
}) {
  return (
    <Row depth={depth} selected={isSel("object", obj.id)} onClick={() => onSelect({ kind: "object", id: obj.id })}
      icon={<Armchair size={12} className="text-zinc-500" />} label={obj.type} />
  );
}

function Row({
  depth,
  label,
  meta,
  icon,
  caret,
  onToggle,
  selected,
  muted,
  onClick,
}: {
  depth: number;
  label: string;
  meta?: string;
  icon?: React.ReactNode;
  caret?: boolean;
  onToggle?: () => void;
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
      {caret !== undefined ? (
        <button onClick={(e) => { e.stopPropagation(); onToggle?.(); }} className="text-zinc-500 -ml-0.5">
          {caret ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      ) : (
        icon ?? <span className="w-3" />
      )}
      <span className="truncate flex-1">{label}</span>
      {meta && <span className="text-[10px] text-zinc-500 font-mono">{meta}</span>}
    </div>
  );
}
