import type { BuildingDocument, EntityRef, Floor } from "@react-arch/core";
import { allFloors, furnitureDims } from "@react-arch/core";
import {
  type Vec2,
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
export interface ObjectDraw {
  id: string;
  floorId: string;
  type: string;
  center: Vec2;
  /** Footprint size [width(X), depth(Y)] in metres. */
  size: [number, number];
  rotation: number;
}
export interface StairDraw {
  id: string;
  floorId: string;
  /** Bottom-start corner. */
  origin: Vec2;
  /** Unit travel direction (up the flight). */
  dir: Vec2;
  /** Unit width direction (perpendicular). */
  normal: Vec2;
  width: number;
  run: number;
  steps: number;
  /** Footprint polygon (for fill + hit-test). */
  polygon: Vec2[];
}
export interface PlanScene {
  walls: WallDraw[];
  rooms: RoomDraw[];
  openings: OpeningDraw[];
  objects: ObjectDraw[];
  stairs: StairDraw[];
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
  const scene: PlanScene = { walls: [], rooms: [], openings: [], objects: [], stairs: [] };
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
        polygon: wallPolygon(w, w.thickness / 2),
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
    for (const ob of floor.objects) {
      const d = furnitureDims(ob.type, ob.scale);
      scene.objects.push({
        id: ob.id,
        floorId: floor.id,
        type: ob.type,
        center: [ob.position[0], ob.position[1]],
        size: [d.width, d.depth],
        rotation: ob.rotation[2],
      });
    }
    for (const st of floor.stairs) {
      const dir: Vec2 = [Math.cos(st.direction), Math.sin(st.direction)];
      const nrm: Vec2 = [-dir[1], dir[0]];
      const o = st.position;
      const a: Vec2 = o;
      const b: Vec2 = [o[0] + dir[0] * st.run, o[1] + dir[1] * st.run];
      const c: Vec2 = [b[0] + nrm[0] * st.width, b[1] + nrm[1] * st.width];
      const dd: Vec2 = [o[0] + nrm[0] * st.width, o[1] + nrm[1] * st.width];
      scene.stairs.push({
        id: st.id,
        floorId: floor.id,
        origin: o,
        dir,
        normal: nrm,
        width: st.width,
        run: st.run,
        steps: st.steps,
        polygon: [a, b, c, dd],
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
  // Openings first (smallest), then furniture, then walls, then rooms.
  for (const o of scene.openings) {
    if (projectPointOnSegment(point, o.p0, o.p1).distance <= tolerance) {
      return { kind: "opening", id: o.id };
    }
  }
  for (const ob of scene.objects) {
    const dx0 = point[0] - ob.center[0];
    const dy0 = point[1] - ob.center[1];
    const c = Math.cos(-ob.rotation);
    const s = Math.sin(-ob.rotation);
    const dx = Math.abs(dx0 * c - dy0 * s);
    const dy = Math.abs(dx0 * s + dy0 * c);
    if (dx <= ob.size[0] / 2 + tolerance && dy <= ob.size[1] / 2 + tolerance) {
      return { kind: "object", id: ob.id };
    }
  }
  for (const st of scene.stairs) {
    if (pointInPolygon(point, st.polygon)) {
      return { kind: "stair", id: st.id };
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
