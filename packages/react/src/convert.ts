import { createId, type Units, type Vec2 } from "@react-arch/shared";
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

function toMaterial(node: Instance): Material {
  const p = node.props;
  return {
    id: str(p, "id") ?? createId("mat"),
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

function convertFloor(node: Instance, buildingId: string, materials: Material[]): Floor {
  const p = node.props;
  const floor: Floor = {
    id: str(p, "id") ?? createId("floor"),
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

  const makeWall = (start: Vec2, end: Vec2, thickness: number, materialId?: string): Wall => {
    const w: Wall = {
      id: createId("wall"),
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
        materials.push(toMaterial(child));
        break;

      case TAG.wall: {
        const from = vec2(child.props.from) ?? [0, 0];
        const to = vec2(child.props.to) ?? [0, 0];
        const w = makeWall(from, to, num(child.props, "thickness", 0.2), str(child.props, "materialId"));
        if (str(child.props, "id")) w.id = str(child.props, "id")!;
        if (typeof child.props.height === "number") w.height = child.props.height;
        break;
      }

      case TAG.room: {
        const x = num(child.props, "x", 0);
        const y = num(child.props, "y", 0);
        const w = num(child.props, "width", 4);
        const d = num(child.props, "depth", 4);
        const thickness = num(child.props, "wallThickness", 0.2);
        const polygon: Vec2[] = [
          [x, y],
          [x + w, y],
          [x + w, y + d],
          [x, y + d],
        ];
        const room: Room = {
          id: str(child.props, "id") ?? createId("room"),
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
          north: makeWall([x, y], [x + w, y], thickness),
          south: makeWall([x, y + d], [x + w, y + d], thickness),
          west: makeWall([x, y], [x, y + d], thickness),
          east: makeWall([x + w, y], [x + w, y + d], thickness),
        };
        room.boundaryWallIds = Object.values(sides).map((s) => s.id);

        for (const o of flatten(child.children)) {
          if (o.tag !== TAG.door && o.tag !== TAG.window && o.tag !== TAG.opening) continue;
          const type = o.tag === TAG.door ? "door" : o.tag === TAG.window ? "window" : "opening";
          const def = OPENING_DEFAULTS[type]!;
          const side = (str(o.props, "wall") as RoomSide) ?? "south";
          const wall = sides[side] ?? sides.south;
          const wallLen = side === "north" || side === "south" ? w : d;
          const opening: Opening = {
            id: str(o.props, "id") ?? createId("opening"),
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

      case TAG.furniture: {
        const obj: BuildingObject = {
          id: str(child.props, "id") ?? createId("object"),
          floorId: floor.id,
          type: str(child.props, "type") ?? "object",
          position: [num(child.props, "x", 0), num(child.props, "y", 0), num(child.props, "z", 0)],
          rotation: [0, 0, num(child.props, "rotation", 0)],
          scale: [num(child.props, "scaleX", 1), num(child.props, "scaleY", 1), num(child.props, "scaleZ", 1)],
          assetId: str(child.props, "assetId"),
        };
        floor.objects.push(obj);
        break;
      }

      default:
        // slab / roof / stairs are reserved; ignored for the MVP model.
        break;
    }
  }

  return floor;
}

/**
 * Convert a rendered instance tree into the canonical BuildingDocument.
 * `fallbackName` is used when the <Building> has no `name` prop (e.g. the
 * registered composition name).
 */
export function convert(instances: Instance[], fallbackName = "Untitled"): BuildingDocument {
  const tops = flatten(instances);
  const materials: Material[] = [...DEFAULT_MATERIALS];
  for (const n of tops) if (n.tag === TAG.material) materials.push(toMaterial(n));

  const buildingNodes = tops.filter((n) => n.tag === TAG.building);
  const buildings: Building[] = [];
  let units: Units = "metric";
  let docName = fallbackName;

  const sources = buildingNodes.length > 0 ? buildingNodes : [{ tag: TAG.building, props: {}, children: tops }];

  for (const bn of sources) {
    const buildingId = str(bn.props, "id") ?? createId("bld");
    const name = str(bn.props, "name") ?? fallbackName;
    if (str(bn.props, "units") === "imperial") units = "imperial";
    docName = name;
    const floors = flatten(bn.children)
      .filter((c) => c.tag === TAG.floor)
      .map((fn) => convertFloor(fn, buildingId, materials));
    // Keep floors ordered by elevation for stable stacking.
    floors.sort((a, b) => a.elevation - b.elevation);
    buildings.push({ id: buildingId, name, floors });
  }

  return {
    id: createId("doc"),
    version: MODEL_VERSION,
    name: docName,
    units,
    buildings,
    materials,
    assets: [],
    metadata: { source: "react" },
  };
}
