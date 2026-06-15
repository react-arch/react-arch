import type { BuildingDocument, EntityRef, Floor } from "@react-arch/core";
import { allFloors } from "@react-arch/core";
import {
  type Vec2,
  distance,
  normal,
  openingSpan,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  projectPointOnSegment,
  wallDirection,
  wallPolygon,
} from "@react-arch/geometry";

export interface WallDraw {
  id: string;
  floorId: string;
  polygon: Vec2[];
  start: Vec2;
  end: Vec2;
  thickness: number;
}
export interface RoomDraw {
  id: string;
  floorId: string;
  name: string;
  polygon: Vec2[];
  centroid: Vec2;
  area: number;
}
export interface OpeningDraw {
  id: string;
  floorId: string;
  type: "door" | "window" | "opening";
  p0: Vec2;
  p1: Vec2;
  center: Vec2;
  dir: Vec2;
  normal: Vec2;
  width: number;
}
export interface PlanScene {
  walls: WallDraw[];
  rooms: RoomDraw[];
  openings: OpeningDraw[];
}

function visibleFloors(doc: BuildingDocument, floorIds: string[] | "all"): Floor[] {
  const floors = allFloors(doc);
  if (floorIds === "all") return floors.filter((f) => f.visible);
  return floors.filter((f) => floorIds.includes(f.id));
}

export function buildPlanScene(
  doc: BuildingDocument,
  floorIds: string[] | "all",
): PlanScene {
  const scene: PlanScene = { walls: [], rooms: [], openings: [] };
  for (const floor of visibleFloors(doc, floorIds)) {
    for (const r of floor.rooms) {
      scene.rooms.push({
        id: r.id,
        floorId: floor.id,
        name: r.name,
        polygon: r.polygon,
        centroid: polygonCentroid(r.polygon),
        area: polygonArea(r.polygon),
      });
    }
    const wallById = new Map(floor.walls.map((w) => [w.id, w]));
    for (const w of floor.walls) {
      scene.walls.push({
        id: w.id,
        floorId: floor.id,
        polygon: wallPolygon(w),
        start: w.start,
        end: w.end,
        thickness: w.thickness,
      });
    }
    for (const o of floor.openings) {
      const wall = wallById.get(o.wallId);
      if (!wall) continue;
      const span = openingSpan(wall, o);
      const dir = wallDirection(wall);
      scene.openings.push({
        id: o.id,
        floorId: floor.id,
        type: o.type,
        p0: span.start,
        p1: span.end,
        center: span.center,
        dir,
        normal: normal(dir),
        width: o.width,
      });
    }
  }
  return scene;
}

/** Hit-test a world point against the scene, nearest-first by entity type. */
export function hitTest(
  scene: PlanScene,
  point: Vec2,
  tolerance: number,
): EntityRef | null {
  // Openings first (smallest), then walls, then rooms.
  for (const o of scene.openings) {
    if (distance(point, o.center) <= Math.max(tolerance, o.width / 2)) {
      return { kind: "opening", id: o.id };
    }
  }
  for (const w of scene.walls) {
    const proj = projectPointOnSegment(point, w.start, w.end);
    if (proj.distance <= w.thickness / 2 + tolerance) {
      return { kind: "wall", id: w.id };
    }
  }
  for (const r of scene.rooms) {
    if (pointInPolygon(point, r.polygon)) {
      return { kind: "room", id: r.id };
    }
  }
  return null;
}
