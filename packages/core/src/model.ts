import type { Units, Vec2, Vec3 } from "@react-arch/shared";

/** The current on-disk model version. Bump when the schema changes. */
export const MODEL_VERSION = "0.1.0";

export type OpeningType = "door" | "window" | "opening";
export type SwingDirection = "in" | "out";
export type HingeSide = "left" | "right";

export interface Wall {
  id: string;
  floorId: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  materialId?: string;
  layerId?: string;
  locked?: boolean;
}

export interface Opening {
  id: string;
  floorId: string;
  wallId: string;
  type: OpeningType;
  /** Distance along the wall centerline to the opening center. */
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
  swing?: SwingDirection;
  hinge?: HingeSide;
  materialId?: string;
}

export interface Room {
  id: string;
  floorId: string;
  name: string;
  /** Explicit polygon (metres). Rooms may also be derived from wall loops. */
  polygon: Vec2[];
  boundaryWallIds?: string[];
  floorMaterialId?: string;
  ceilingMaterialId?: string;
  usageType?: string;
  height?: number;
}

export interface BuildingObject {
  id: string;
  floorId: string;
  type: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  assetId?: string;
  metadata?: Record<string, unknown>;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  elevation: number;
  height: number;
  visible: boolean;
  locked: boolean;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  objects: BuildingObject[];
}

export interface Building {
  id: string;
  name: string;
  floors: Floor[];
}

export type MaterialCategory =
  | "wall"
  | "floor"
  | "ceiling"
  | "glass"
  | "wood"
  | "metal"
  | "ceramic"
  | "custom";

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  baseColor: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  textureUrl?: string;
}

export interface Asset {
  id: string;
  name: string;
  url?: string;
  kind: string;
}

export interface Site {
  id: string;
  name: string;
  polygon?: Vec2[];
}

export interface BuildingDocument {
  id: string;
  version: string;
  name: string;
  units: Units;
  site?: Site;
  buildings: Building[];
  materials: Material[];
  assets: Asset[];
  metadata: Record<string, unknown>;
}

/** A single semantic change emitted by a command. */
export interface ModelChange {
  kind: "create" | "update" | "delete";
  entity: "wall" | "room" | "opening" | "floor" | "object" | "document";
  id: string;
}

export interface ModelWarning {
  code: string;
  message: string;
  entityId?: string;
}

export interface CommandResult {
  document: BuildingDocument;
  changes: ModelChange[];
  warnings: ModelWarning[];
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export function findFloor(
  doc: BuildingDocument,
  floorId: string,
): { building: Building; floor: Floor } | undefined {
  for (const building of doc.buildings) {
    const floor = building.floors.find((f) => f.id === floorId);
    if (floor) return { building, floor };
  }
  return undefined;
}

export function allFloors(doc: BuildingDocument): Floor[] {
  return doc.buildings.flatMap((b) => b.floors);
}

export function findWall(doc: BuildingDocument, wallId: string): Wall | undefined {
  for (const floor of allFloors(doc)) {
    const w = floor.walls.find((x) => x.id === wallId);
    if (w) return w;
  }
  return undefined;
}

export function findRoom(doc: BuildingDocument, roomId: string): Room | undefined {
  for (const floor of allFloors(doc)) {
    const r = floor.rooms.find((x) => x.id === roomId);
    if (r) return r;
  }
  return undefined;
}

export function findOpening(
  doc: BuildingDocument,
  openingId: string,
): Opening | undefined {
  for (const floor of allFloors(doc)) {
    const o = floor.openings.find((x) => x.id === openingId);
    if (o) return o;
  }
  return undefined;
}

export type EntityKind = "wall" | "room" | "opening" | "floor" | "object";

export interface EntityRef {
  kind: EntityKind;
  id: string;
}
