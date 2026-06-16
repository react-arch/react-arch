import { round, type Units, type Vec2 } from "@react-arch/shared";
import { dot, normal, normalize, scale, sub } from "@react-arch/geometry";
import {
  DEFAULT_MATERIALS,
  MODEL_VERSION,
  type Building,
  type BuildingDocument,
  type BuildingObject,
  type Floor,
  type Material,
  type Opening,
  type Room,
  type Roof,
  type RoofKind,
  type Wall,
} from "@react-arch/core";
import { TAG, type RoomSide } from "./tags.js";
import type { Instance } from "./renderer.js";

function num(props: Record<string, unknown>, key: string, fallback: number): number {
  const v = props[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str(props: Record<string, unknown>, key: string): string | undefined {
  const v = props[key];
  return typeof v === "string" ? v : undefined;
}
function vec2(v: unknown): Vec2 | undefined {
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && typeof v[1] === "number") {
    return [v[0], v[1]];
  }
  return undefined;
}

function idPart(value: unknown, fallback = "item"): string {
  const raw = typeof value === "string" && value.trim() ? value : fallback;
  return raw.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

function uniqueId(base: string, used: Set<string>): string {
  let id = idPart(base);
  let suffix = 2;
  while (used.has(id)) {
    id = `${idPart(base)}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function idFromProps(props: Record<string, unknown>, base: string, used: Set<string>): string {
  const explicit = str(props, "id");
  if (explicit) {
    used.add(explicit);
    return explicit;
  }
  return uniqueId(base, used);
}

/** Expand transparent <Group> nodes and drop text nodes. */
function flatten(nodes: Instance[]): Instance[] {
  const out: Instance[] = [];
  for (const n of nodes) {
    if (n.tag === TAG.text) continue;
    if (n.tag === TAG.group) out.push(...flatten(n.children));
    else out.push(n);
  }
  return out;
}

function toMaterial(node: Instance, fallbackId: string, usedIds: Set<string>): Material {
  const p = node.props;
  return {
    id: idFromProps(p, fallbackId, usedIds),
    name: str(p, "name") ?? "Material",
    category: (str(p, "category") as Material["category"]) ?? "custom",
    baseColor: str(p, "baseColor") ?? "#cccccc",
    roughness: typeof p.roughness === "number" ? p.roughness : undefined,
    metalness: typeof p.metalness === "number" ? p.metalness : undefined,
    opacity: typeof p.opacity === "number" ? p.opacity : undefined,
    textureUrl: str(p, "textureUrl"),
  };
}

interface OpeningDefaults {
  width: number;
  height: number;
  sill: number;
}
const OPENING_DEFAULTS: Record<string, OpeningDefaults> = {
  door: { width: 0.9, height: 2.1, sill: 0 },
  window: { width: 1.2, height: 1.4, sill: 0.9 },
  opening: { width: 1.0, height: 2.1, sill: 0 },
};

function toObject(node: Instance, floorId: string, fallbackId: string, usedIds: Set<string>): BuildingObject {
  const p = node.props;
  return {
    id: idFromProps(p, fallbackId, usedIds),
    floorId,
    type: str(p, "type") ?? "object",
    position: [num(p, "x", 0), num(p, "y", 0), num(p, "z", 0)],
    rotation: [0, 0, num(p, "rotation", 0)],
    scale: [num(p, "scaleX", 1), num(p, "scaleY", 1), num(p, "scaleZ", 1)],
    assetId: str(p, "assetId"),
  };
}

function toRoof(node: Instance, buildingId: string, index: number, usedIds: Set<string>): Roof {
  const p = node.props;
  const type = (str(p, "type") as RoofKind) ?? "gable";
  return {
    id: idFromProps(p, `${buildingId}-roof-${index + 1}`, usedIds),
    buildingId,
    type: type === "flat" || type === "gable" || type === "hip" ? type : "gable",
    pitch: typeof p.pitch === "number" ? p.pitch : undefined,
    overhang: typeof p.overhang === "number" ? p.overhang : undefined,
    thickness: typeof p.thickness === "number" ? p.thickness : undefined,
    materialId: str(p, "materialId"),
  };
}

function convertFloor(
  node: Instance,
  buildingId: string,
  materials: Material[],
  floorIndex: number,
  usedIds: Set<string>,
): Floor {
  const p = node.props;
  const floor: Floor = {
    id: idFromProps(p, `${buildingId}-floor-${floorIndex + 1}`, usedIds),
    buildingId,
    name: str(p, "name") ?? "Floor",
    elevation: num(p, "elevation", 0),
    height: num(p, "height", 2.8),
    visible: true,
    locked: false,
    walls: [],
    rooms: [],
    openings: [],
    objects: [],
  };

  let wallIndex = 0;
  let materialIndex = 0;
  let objectIndex = 0;

  const makeWall = (start: Vec2, end: Vec2, thickness: number, materialId: string | undefined, idBase: string, explicitId?: string): Wall => {
    const w: Wall = {
      id: explicitId ? (usedIds.add(explicitId), explicitId) : uniqueId(idBase, usedIds),
      floorId: floor.id,
      start,
      end,
      thickness,
      height: floor.height,
      materialId,
    };
    floor.walls.push(w);
    return w;
  };

  for (const child of flatten(node.children)) {
    switch (child.tag) {
      case TAG.material:
        materialIndex += 1;
        materials.push(toMaterial(child, `${floor.id}-material-${materialIndex}`, usedIds));
        break;

      case TAG.wall: {
        const from = vec2(child.props.from) ?? [0, 0];
        const to = vec2(child.props.to) ?? [0, 0];
        wallIndex += 1;
        const w = makeWall(from, to, num(child.props, "thickness", 0.2), str(child.props, "materialId"), `${floor.id}-wall-${wallIndex}`, str(child.props, "id"));
        if (typeof child.props.height === "number") w.height = child.props.height;
        break;
      }

      case TAG.room: {
        const roomIndex = floor.rooms.length + 1;
        const x = num(child.props, "x", 0);
        const y = num(child.props, "y", 0);
        const w = num(child.props, "width", 4);
        const d = num(child.props, "depth", 4);
        const thickness = num(child.props, "wallThickness", 0.2);
        const roomId = idFromProps(child.props, `${floor.id}-room-${roomIndex}`, usedIds);
        const polygon: Vec2[] = [
          [x, y],
          [x + w, y],
          [x + w, y + d],
          [x, y + d],
        ];
        const room: Room = {
          id: roomId,
          floorId: floor.id,
          name: str(child.props, "name") ?? "Room",
          polygon,
          floorMaterialId: str(child.props, "floorMaterial"),
          ceilingMaterialId: str(child.props, "ceilingMaterial"),
          usageType: str(child.props, "usage"),
          height: typeof child.props.height === "number" ? child.props.height : undefined,
        };
        floor.rooms.push(room);

        // Generate perimeter walls. Offsets increase in a natural reading
        // direction per side (L→R for horizontal, T→B for vertical).
        const sides: Record<RoomSide, Wall> = {
          north: makeWall([x, y], [x + w, y], thickness, undefined, `${room.id}-wall-north`),
          south: makeWall([x, y + d], [x + w, y + d], thickness, undefined, `${room.id}-wall-south`),
          west: makeWall([x, y], [x, y + d], thickness, undefined, `${room.id}-wall-west`),
          east: makeWall([x + w, y], [x + w, y + d], thickness, undefined, `${room.id}-wall-east`),
        };
        room.boundaryWallIds = Object.values(sides).map((s) => s.id);

        let roomOpeningIndex = 0;
        let roomObjectIndex = 0;
        for (const o of flatten(child.children)) {
          // Furniture/fixtures are commonly declared inside a room.
          if (o.tag === TAG.furniture) {
            objectIndex += 1;
            roomObjectIndex += 1;
            floor.objects.push(toObject(o, floor.id, `${room.id}-object-${roomObjectIndex}`, usedIds));
            continue;
          }
          if (o.tag !== TAG.door && o.tag !== TAG.window && o.tag !== TAG.opening) continue;
          const type = o.tag === TAG.door ? "door" : o.tag === TAG.window ? "window" : "opening";
          const def = OPENING_DEFAULTS[type]!;
          const side = (str(o.props, "wall") as RoomSide) ?? "south";
          const wall = sides[side] ?? sides.south;
          const wallLen = side === "north" || side === "south" ? w : d;
          roomOpeningIndex += 1;
          const opening: Opening = {
            id: idFromProps(o.props, `${room.id}-${type}-${side}-${roomOpeningIndex}`, usedIds),
            floorId: floor.id,
            wallId: wall.id,
            type,
            offset: num(o.props, "offset", wallLen / 2),
            width: num(o.props, "width", def.width),
            height: num(o.props, "height", def.height),
            sillHeight: num(o.props, "sillHeight", def.sill),
          };
          floor.openings.push(opening);
        }
        break;
      }

      case TAG.furniture:
        objectIndex += 1;
        floor.objects.push(toObject(child, floor.id, `${floor.id}-object-${objectIndex}`, usedIds));
        break;

      default:
        // slab / roof / stairs are reserved; ignored for the MVP model.
        break;
    }
  }

  mergeCoincidentWalls(floor);
  return floor;
}

/**
 * Two adjacent rooms each generate their own perimeter walls, producing a pair
 * of coincident walls on their shared edge. Without merging, a door declared on
 * one room only cuts that room's wall and the neighbour's wall stays solid
 * behind it — the opening never passes through (and the walls z-fight in 3D).
 *
 * This collapses coincident, equal-thickness walls into one survivor and
 * re-points openings (re-projecting their offset) and room boundaries onto it,
 * so an interior door becomes a real passage between the rooms.
 */
function mergeCoincidentWalls(floor: Floor): void {
  interface WallInterval {
    wall: Wall;
    d: Vec2;
    n: Vec2;
    lineOffset: number;
    a: number;
    b: number;
  }

  const intervalOf = (w: Wall): WallInterval => {
    let d = normalize(sub(w.end, w.start));
    if (d[0] < 0 || (d[0] === 0 && d[1] < 0)) d = scale(d, -1);
    const n = normal(d);
    const lineOffset = dot(w.start, n);
    const t0 = dot(w.start, d);
    const t1 = dot(w.end, d);
    return { wall: w, d, n, lineOffset, a: Math.min(t0, t1), b: Math.max(t0, t1) };
  };

  const key = (i: WallInterval): string => {
    if (i.d[0] === 0 && i.d[1] === 0) {
      return `point:${round(i.wall.start[0])},${round(i.wall.start[1])}|${round(i.wall.thickness)}`;
    }
    return `${round(i.d[0])},${round(i.d[1])}|${round(i.lineOffset)}|${round(i.wall.thickness)}`;
  };

  const pointAt = (i: WallInterval, t: number): Vec2 => [
    i.d[0] * t + i.n[0] * i.lineOffset,
    i.d[1] * t + i.n[1] * i.lineOffset,
  ];

  const oldWallById = new Map(
    floor.walls.map((w) => [w.id, { start: [...w.start] as Vec2, end: [...w.end] as Vec2 }]),
  );
  const openingCenters = new Map<string, Vec2>();
  for (const o of floor.openings) {
    const w = oldWallById.get(o.wallId);
    if (!w) continue;
    const d = normalize(sub(w.end, w.start));
    openingCenters.set(o.id, [w.start[0] + d[0] * o.offset, w.start[1] + d[1] * o.offset]);
  }

  const groups = new Map<string, WallInterval[]>();
  for (const w of floor.walls) {
    const interval = intervalOf(w);
    const k = key(interval);
    const g = groups.get(k);
    if (g) g.push(interval);
    else groups.set(k, [interval]);
  }

  const survivors: Wall[] = [];
  const survivorOf = new Map<string, Wall>(); // any wall id -> survivor wall
  let mergedAny = false;

  const flush = (active: WallInterval[], a: number, b: number) => {
    const survivor = active[0]!.wall;
    if (active.length > 1) {
      survivor.start = pointAt(active[0]!, a);
      survivor.end = pointAt(active[0]!, b);
      mergedAny = true;
    }
    survivors.push(survivor);
    for (const i of active) survivorOf.set(i.wall.id, survivor);
  };

  for (const group of groups.values()) {
    if (group.length === 1) {
      const only = group[0]!;
      survivors.push(only.wall);
      survivorOf.set(only.wall.id, only.wall);
      continue;
    }

    const sorted = [...group].sort((a, b) => a.a - b.a);
    let active: WallInterval[] = [];
    let activeA = 0;
    let activeB = 0;
    for (const interval of sorted) {
      if (active.length === 0) {
        active = [interval];
        activeA = interval.a;
        activeB = interval.b;
        continue;
      }
      if (interval.a < activeB - 1e-6) {
        active.push(interval);
        activeA = Math.min(activeA, interval.a);
        activeB = Math.max(activeB, interval.b);
      } else {
        flush(active, activeA, activeB);
        active = [interval];
        activeA = interval.a;
        activeB = interval.b;
      }
    }
    if (active.length > 0) flush(active, activeA, activeB);
  }

  if (!mergedAny) return;

  for (const o of floor.openings) {
    const survivor = survivorOf.get(o.wallId);
    if (!survivor) continue;
    const center = openingCenters.get(o.id);
    if (center) {
      // Offset of the original world centre along the survivor.
      const sd = normalize(sub(survivor.end, survivor.start));
      o.offset = dot(sub(center, survivor.start), sd);
    }
    o.wallId = survivor.id;
  }

  for (const r of floor.rooms) {
    if (r.boundaryWallIds) {
      r.boundaryWallIds = Array.from(
        new Set(r.boundaryWallIds.map((id) => survivorOf.get(id)?.id ?? id)),
      );
    }
  }

  floor.walls = survivors;
}

/**
 * Convert a rendered instance tree into the canonical BuildingDocument.
 * `fallbackName` is used when the <Building> has no `name` prop (e.g. the
 * registered composition name).
 */
export function convert(instances: Instance[], fallbackName = "Untitled"): BuildingDocument {
  const tops = flatten(instances);
  const usedIds = new Set(DEFAULT_MATERIALS.map((m) => m.id));
  const materials: Material[] = DEFAULT_MATERIALS.map((m) => ({ ...m }));
  let topMaterialIndex = 0;
  for (const n of tops) {
    if (n.tag === TAG.material) {
      topMaterialIndex += 1;
      materials.push(toMaterial(n, `material-${topMaterialIndex}`, usedIds));
    }
  }

  const buildingNodes = tops.filter((n) => n.tag === TAG.building);
  const buildings: Building[] = [];
  let units: Units = "metric";
  let docName = fallbackName;

  const sources = buildingNodes.length > 0 ? buildingNodes : [{ tag: TAG.building, props: {}, children: tops }];

  sources.forEach((bn, buildingIndex) => {
    const buildingId = idFromProps(bn.props, `building-${buildingIndex + 1}`, usedIds);
    const name = str(bn.props, "name") ?? fallbackName;
    if (str(bn.props, "units") === "imperial") units = "imperial";
    docName = name;
    const floors = flatten(bn.children)
      .filter((c) => c.tag === TAG.floor)
      .map((fn, floorIndex) => convertFloor(fn, buildingId, materials, floorIndex, usedIds));
    // Keep floors ordered by elevation for stable stacking.
    floors.sort((a, b) => a.elevation - b.elevation);

    const roofs = flatten(bn.children)
      .filter((c) => c.tag === TAG.roof)
      .map((rn, i) => toRoof(rn, buildingId, i, usedIds));

    buildings.push({ id: buildingId, name, floors, ...(roofs.length ? { roofs } : {}) });
  });

  return {
    id: uniqueId(`doc-${docName}`, usedIds),
    version: MODEL_VERSION,
    name: docName,
    units,
    buildings,
    materials,
    assets: [],
    metadata: { source: "react" },
  };
}
