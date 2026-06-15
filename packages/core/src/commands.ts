import { createId, deepClone, type Vec2 } from "@react-arch/shared";
import { openingFits, wallLength, type WallLike } from "@react-arch/geometry";
import {
  type BuildingDocument,
  type CommandResult,
  type Floor,
  type ModelChange,
  type ModelWarning,
  type Opening,
  type OpeningType,
  type Room,
  type Wall,
  findFloor,
} from "./model.js";

/**
 * Commands are pure: they take a document and return a brand-new document plus
 * a list of changes and warnings. They never mutate the input. The studio /
 * editor layers feed these into the history stack for undo/redo.
 */

function mutate(
  doc: BuildingDocument,
  fn: (draft: BuildingDocument, warnings: ModelWarning[]) => ModelChange[],
): CommandResult {
  const draft = deepClone(doc);
  const warnings: ModelWarning[] = [];
  const changes = fn(draft, warnings);
  return { document: draft, changes, warnings };
}

function requireFloor(doc: BuildingDocument, floorId: string): Floor {
  const found = findFloor(doc, floorId);
  if (!found) throw new Error(`Floor not found: ${floorId}`);
  return found.floor;
}

// --- Walls -----------------------------------------------------------------

export interface CreateWallInput {
  floorId: string;
  start: Vec2;
  end: Vec2;
  thickness?: number;
  height?: number;
  materialId?: string;
  id?: string;
}

export function createWall(
  doc: BuildingDocument,
  input: CreateWallInput,
): CommandResult {
  return mutate(doc, (draft) => {
    const floor = requireFloor(draft, input.floorId);
    const wall: Wall = {
      id: input.id ?? createId("wall"),
      floorId: input.floorId,
      start: input.start,
      end: input.end,
      thickness: input.thickness ?? 0.2,
      height: input.height ?? floor.height,
      materialId: input.materialId,
    };
    floor.walls.push(wall);
    return [{ kind: "create", entity: "wall", id: wall.id }];
  });
}

export function updateWall(
  doc: BuildingDocument,
  wallId: string,
  patch: Partial<Omit<Wall, "id" | "floorId">>,
): CommandResult {
  return mutate(doc, (draft, warnings) => {
    for (const floor of allFloorsOf(draft)) {
      const wall = floor.walls.find((w) => w.id === wallId);
      if (!wall) continue;
      Object.assign(wall, patch);
      reattachOpenings(floor, wall, warnings);
      return [{ kind: "update", entity: "wall", id: wallId }];
    }
    warnings.push({ code: "wall-missing", message: `Wall ${wallId} not found` });
    return [];
  });
}

/** Move a wall's endpoints, keeping attached openings within bounds. */
export function moveWall(
  doc: BuildingDocument,
  wallId: string,
  start: Vec2,
  end: Vec2,
): CommandResult {
  return updateWall(doc, wallId, { start, end });
}

export function deleteWall(doc: BuildingDocument, wallId: string): CommandResult {
  return mutate(doc, (draft) => {
    const changes: ModelChange[] = [];
    for (const floor of allFloorsOf(draft)) {
      const idx = floor.walls.findIndex((w) => w.id === wallId);
      if (idx === -1) continue;
      floor.walls.splice(idx, 1);
      changes.push({ kind: "delete", entity: "wall", id: wallId });
      // Cascade: drop openings attached to the wall.
      floor.openings = floor.openings.filter((o) => {
        if (o.wallId === wallId) {
          changes.push({ kind: "delete", entity: "opening", id: o.id });
          return false;
        }
        return true;
      });
      break;
    }
    return changes;
  });
}

// --- Rooms -----------------------------------------------------------------

export interface CreateRoomInput {
  floorId: string;
  name: string;
  polygon: Vec2[];
  id?: string;
  floorMaterialId?: string;
  ceilingMaterialId?: string;
  usageType?: string;
}

/** Convenience: build a rectangular room from origin + size. */
export function rectRoomPolygon(
  x: number,
  y: number,
  width: number,
  depth: number,
): Vec2[] {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + depth],
    [x, y + depth],
  ];
}

export function createRoom(
  doc: BuildingDocument,
  input: CreateRoomInput,
): CommandResult {
  return mutate(doc, (draft) => {
    const floor = requireFloor(draft, input.floorId);
    const room: Room = {
      id: input.id ?? createId("room"),
      floorId: input.floorId,
      name: input.name,
      polygon: input.polygon,
      floorMaterialId: input.floorMaterialId,
      ceilingMaterialId: input.ceilingMaterialId,
      usageType: input.usageType,
    };
    floor.rooms.push(room);
    return [{ kind: "create", entity: "room", id: room.id }];
  });
}

export function updateRoom(
  doc: BuildingDocument,
  roomId: string,
  patch: Partial<Omit<Room, "id" | "floorId">>,
): CommandResult {
  return mutate(doc, (draft, warnings) => {
    for (const floor of allFloorsOf(draft)) {
      const room = floor.rooms.find((r) => r.id === roomId);
      if (!room) continue;
      Object.assign(room, patch);
      return [{ kind: "update", entity: "room", id: roomId }];
    }
    warnings.push({ code: "room-missing", message: `Room ${roomId} not found` });
    return [];
  });
}

export function deleteRoom(doc: BuildingDocument, roomId: string): CommandResult {
  return mutate(doc, (draft) => {
    for (const floor of allFloorsOf(draft)) {
      const idx = floor.rooms.findIndex((r) => r.id === roomId);
      if (idx === -1) continue;
      floor.rooms.splice(idx, 1);
      return [{ kind: "delete", entity: "room", id: roomId }];
    }
    return [];
  });
}

// --- Openings --------------------------------------------------------------

export interface CreateOpeningInput {
  wallId: string;
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
  id?: string;
}

export function createOpening(
  doc: BuildingDocument,
  input: CreateOpeningInput,
): CommandResult {
  return mutate(doc, (draft, warnings) => {
    for (const floor of allFloorsOf(draft)) {
      const wall = floor.walls.find((w) => w.id === input.wallId);
      if (!wall) continue;
      const opening: Opening = {
        id: input.id ?? createId("opening"),
        floorId: floor.id,
        wallId: input.wallId,
        type: input.type,
        offset: input.offset,
        width: input.width,
        height: input.height,
        sillHeight: input.sillHeight ?? (input.type === "window" ? 0.9 : 0),
      };
      if (!openingFits(wall, opening)) {
        warnings.push({
          code: "opening-overflow",
          message: `Opening ${opening.id} does not fit within wall ${wall.id}`,
          entityId: opening.id,
        });
      }
      floor.openings.push(opening);
      return [{ kind: "create", entity: "opening", id: opening.id }];
    }
    warnings.push({
      code: "wall-missing",
      message: `Wall ${input.wallId} not found for opening`,
    });
    return [];
  });
}

export function updateOpening(
  doc: BuildingDocument,
  openingId: string,
  patch: Partial<Omit<Opening, "id" | "floorId" | "wallId">>,
): CommandResult {
  return mutate(doc, (draft, warnings) => {
    for (const floor of allFloorsOf(draft)) {
      const opening = floor.openings.find((o) => o.id === openingId);
      if (!opening) continue;
      Object.assign(opening, patch);
      const wall = floor.walls.find((w) => w.id === opening.wallId);
      if (wall && !openingFits(wall, opening)) {
        warnings.push({
          code: "opening-overflow",
          message: `Opening ${opening.id} no longer fits its wall`,
          entityId: opening.id,
        });
      }
      return [{ kind: "update", entity: "opening", id: openingId }];
    }
    return [];
  });
}

export function moveOpening(
  doc: BuildingDocument,
  openingId: string,
  offset: number,
): CommandResult {
  return updateOpening(doc, openingId, { offset });
}

export function deleteOpening(
  doc: BuildingDocument,
  openingId: string,
): CommandResult {
  return mutate(doc, (draft) => {
    for (const floor of allFloorsOf(draft)) {
      const idx = floor.openings.findIndex((o) => o.id === openingId);
      if (idx === -1) continue;
      floor.openings.splice(idx, 1);
      return [{ kind: "delete", entity: "opening", id: openingId }];
    }
    return [];
  });
}

// --- Floors ----------------------------------------------------------------

export interface CreateFloorInput {
  buildingId: string;
  name: string;
  elevation: number;
  height?: number;
  id?: string;
}

export function createFloor(
  doc: BuildingDocument,
  input: CreateFloorInput,
): CommandResult {
  return mutate(doc, (draft, warnings) => {
    const building = draft.buildings.find((b) => b.id === input.buildingId);
    if (!building) {
      warnings.push({ code: "building-missing", message: "Building not found" });
      return [];
    }
    const floor: Floor = {
      id: input.id ?? createId("floor"),
      buildingId: building.id,
      name: input.name,
      elevation: input.elevation,
      height: input.height ?? 2.8,
      visible: true,
      locked: false,
      walls: [],
      rooms: [],
      openings: [],
      objects: [],
    };
    building.floors.push(floor);
    building.floors.sort((a, b) => a.elevation - b.elevation);
    return [{ kind: "create", entity: "floor", id: floor.id }];
  });
}

export function duplicateFloor(
  doc: BuildingDocument,
  floorId: string,
): CommandResult {
  return mutate(doc, (draft) => {
    for (const building of draft.buildings) {
      const floor = building.floors.find((f) => f.id === floorId);
      if (!floor) continue;
      const idMap = new Map<string, string>();
      const copy: Floor = deepClone(floor);
      copy.id = createId("floor");
      copy.name = `${floor.name} (copy)`;
      copy.elevation = floor.elevation + floor.height;
      // Re-id child entities and keep opening→wall references consistent.
      copy.walls.forEach((w) => {
        const nid = createId("wall");
        idMap.set(w.id, nid);
        w.id = nid;
        w.floorId = copy.id;
      });
      copy.openings.forEach((o) => {
        o.id = createId("opening");
        o.floorId = copy.id;
        o.wallId = idMap.get(o.wallId) ?? o.wallId;
      });
      copy.rooms.forEach((r) => {
        r.id = createId("room");
        r.floorId = copy.id;
      });
      copy.objects.forEach((ob) => {
        ob.id = createId("object");
        ob.floorId = copy.id;
      });
      building.floors.push(copy);
      building.floors.sort((a, b) => a.elevation - b.elevation);
      return [{ kind: "create", entity: "floor", id: copy.id }];
    }
    return [];
  });
}

export function reorderFloor(
  doc: BuildingDocument,
  floorId: string,
  newElevation: number,
): CommandResult {
  return mutate(doc, (draft) => {
    const floor = requireFloor(draft, floorId);
    floor.elevation = newElevation;
    for (const building of draft.buildings) {
      building.floors.sort((a, b) => a.elevation - b.elevation);
    }
    return [{ kind: "update", entity: "floor", id: floorId }];
  });
}

export function updateFloor(
  doc: BuildingDocument,
  floorId: string,
  patch: Partial<Pick<Floor, "name" | "elevation" | "height" | "visible" | "locked">>,
): CommandResult {
  return mutate(doc, (draft) => {
    const floor = requireFloor(draft, floorId);
    Object.assign(floor, patch);
    return [{ kind: "update", entity: "floor", id: floorId }];
  });
}

export function deleteFloor(doc: BuildingDocument, floorId: string): CommandResult {
  return mutate(doc, (draft) => {
    for (const building of draft.buildings) {
      const idx = building.floors.findIndex((f) => f.id === floorId);
      if (idx === -1) continue;
      building.floors.splice(idx, 1);
      return [{ kind: "delete", entity: "floor", id: floorId }];
    }
    return [];
  });
}

// --- internals -------------------------------------------------------------

function allFloorsOf(doc: BuildingDocument): Floor[] {
  return doc.buildings.flatMap((b) => b.floors);
}

/** Clamp openings so they stay attached after a wall changes length. */
function reattachOpenings(floor: Floor, wall: Wall, warnings: ModelWarning[]): void {
  const wl: WallLike = wall;
  const len = wallLength(wl);
  for (const opening of floor.openings) {
    if (opening.wallId !== wall.id) continue;
    const half = opening.width / 2;
    const clamped = Math.min(Math.max(opening.offset, half), Math.max(half, len - half));
    if (clamped !== opening.offset) {
      opening.offset = clamped;
      warnings.push({
        code: "opening-reclamped",
        message: `Opening ${opening.id} re-positioned to stay on wall`,
        entityId: opening.id,
      });
    }
  }
}
