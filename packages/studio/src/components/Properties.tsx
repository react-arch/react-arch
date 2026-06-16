import { allFloors, findFloor, findOpening, findRoom, findWall, furnitureDims, type BuildingDocument } from "@react-arch/core";
import { polygonArea, wallLength } from "@react-arch/geometry";
import { useStudio } from "../store.js";

export function Properties({ doc }: { doc: BuildingDocument }) {
  const { selection } = useStudio();

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-edge">
        Properties
      </div>
      <div className="p-3">
        {!selection && <Empty />}
        {selection?.kind === "wall" && <WallProps doc={doc} id={selection.id} />}
        {selection?.kind === "room" && <RoomProps doc={doc} id={selection.id} />}
        {selection?.kind === "opening" && <OpeningProps doc={doc} id={selection.id} />}
        {selection?.kind === "floor" && <FloorProps doc={doc} id={selection.id} />}
        {selection?.kind === "object" && <ObjectProps doc={doc} id={selection.id} />}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-zinc-500 text-xs leading-relaxed">
      Nothing selected.
      <div className="mt-2 text-zinc-600">
        Click an element in any view. Values are read-only — React Arch is a visualizer; edit the building in
        your code and the views update live.
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-edge/50">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}

function Header({ kind, name }: { kind: string; name: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] uppercase tracking-wider text-accent">{kind}</div>
      <div className="text-sm font-medium text-zinc-100">{name}</div>
    </div>
  );
}

function WallProps({ doc, id }: { doc: BuildingDocument; id: string }) {
  const w = findWall(doc, id);
  if (!w) return <Empty />;
  return (
    <div className="text-xs">
      <Header kind="Wall" name={id} />
      <Field label="Length" value={`${wallLength(w).toFixed(2)} m`} />
      <Field label="Thickness" value={`${w.thickness} m`} />
      <Field label="Height" value={`${w.height} m`} />
      <Field label="Start" value={`${w.start[0]}, ${w.start[1]}`} />
      <Field label="End" value={`${w.end[0]}, ${w.end[1]}`} />
      <Field label="Material" value={w.materialId ?? "default"} />
    </div>
  );
}

function RoomProps({ doc, id }: { doc: BuildingDocument; id: string }) {
  const r = findRoom(doc, id);
  if (!r) return <Empty />;
  const area = polygonArea(r.polygon);
  const xs = r.polygon.map((p) => p[0]);
  const ys = r.polygon.map((p) => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...ys) - Math.min(...ys);
  const height = r.height ?? 2.8;
  return (
    <div className="text-xs">
      <Header kind="Room" name={r.name} />
      <Field label="Width" value={`${width.toFixed(2)} m`} />
      <Field label="Depth" value={`${depth.toFixed(2)} m`} />
      <Field label="Height" value={`${height} m`} />
      <Field label="Area" value={`${area.toFixed(2)} m²`} />
      <Field label="Volume" value={`${(area * height).toFixed(2)} m³`} />
      <Field label="Usage" value={r.usageType ?? "—"} />
    </div>
  );
}

function OpeningProps({ doc, id }: { doc: BuildingDocument; id: string }) {
  const o = findOpening(doc, id);
  if (!o) return <Empty />;
  return (
    <div className="text-xs">
      <Header kind={o.type} name={id} />
      <Field label="Width" value={`${o.width} m`} />
      <Field label="Height" value={`${o.height} m`} />
      <Field label="Offset" value={`${o.offset} m`} />
      <Field label="Sill height" value={`${o.sillHeight} m`} />
      <Field label="Wall" value={o.wallId} />
    </div>
  );
}

function ObjectProps({ doc, id }: { doc: BuildingDocument; id: string }) {
  const obj = allFloors(doc)
    .flatMap((f) => f.objects)
    .find((o) => o.id === id);
  if (!obj) return <Empty />;
  const d = furnitureDims(obj.type, obj.scale);
  return (
    <div className="text-xs">
      <Header kind="Furniture" name={obj.type} />
      <Field label="Position" value={`${obj.position[0].toFixed(2)}, ${obj.position[1].toFixed(2)}`} />
      <Field label="Width" value={`${d.width.toFixed(2)} m`} />
      <Field label="Depth" value={`${d.depth.toFixed(2)} m`} />
      <Field label="Height" value={`${d.height.toFixed(2)} m`} />
    </div>
  );
}

function FloorProps({ doc, id }: { doc: BuildingDocument; id: string }) {
  const found = findFloor(doc, id);
  if (!found) return <Empty />;
  const f = found.floor;
  return (
    <div className="text-xs">
      <Header kind="Floor" name={f.name} />
      <Field label="Elevation" value={`${f.elevation} m`} />
      <Field label="Height" value={`${f.height} m`} />
      <Field label="Rooms" value={f.rooms.length} />
      <Field label="Walls" value={f.walls.length} />
      <Field label="Openings" value={f.openings.length} />
    </div>
  );
}
