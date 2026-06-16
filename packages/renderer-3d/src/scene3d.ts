import type { BuildingDocument } from "@react-arch/core";
import { allFloors, furnitureDims } from "@react-arch/core";
import { bounds, wallBoxes, wallDirection, wallLength, type Vec2 } from "@react-arch/geometry";

/**
 * Plan→world mapping: plan X → world X, plan Y → world Z, height → world Y.
 * All records below carry positions/rotations/sizes ready to drop onto meshes.
 */

export interface BoxMesh {
  key: string;
  entityId: string;
  floorId: string;
  kind: "wall";
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
  materialId?: string;
}
export interface SlabMesh {
  key: string;
  entityId: string;
  floorId: string;
  kind: "slab";
  position: [number, number, number];
  size: [number, number, number];
}
export interface PanelMesh {
  key: string;
  entityId: string;
  floorId: string;
  kind: "door" | "window" | "opening";
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
}

export interface ObjectMesh {
  key: string;
  entityId: string;
  floorId: string;
  kind: "object";
  objectType: string;
  position: [number, number, number];
  rotationY: number;
  size: [number, number, number];
}

export interface Scene3D {
  boxes: BoxMesh[];
  slabs: SlabMesh[];
  panels: PanelMesh[];
  objects: ObjectMesh[];
  center: [number, number, number];
  radius: number;
}

export interface Build3DOptions {
  floorIds: string[] | "all";
  exploded?: boolean;
  explodeGap?: number;
  showSlabs?: boolean;
}

const SLAB_THICKNESS = 0.14;

export function build3DScene(doc: BuildingDocument, opts: Build3DOptions): Scene3D {
  const floors = allFloors(doc);
  const ordered = [...floors].sort((a, b) => a.elevation - b.elevation);
  const gap = opts.explodeGap ?? 3;

  const boxes: BoxMesh[] = [];
  const slabs: SlabMesh[] = [];
  const panels: PanelMesh[] = [];
  const objects: ObjectMesh[] = [];
  const allPts: Vec2[] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  ordered.forEach((floor, index) => {
    const visible = opts.floorIds === "all" ? floor.visible : opts.floorIds.includes(floor.id);
    if (!visible) return;
    const elevation = floor.elevation + (opts.exploded ? index * gap : 0);
    minY = Math.min(minY, elevation);
    maxY = Math.max(maxY, elevation + floor.height);

    const wallById = new Map(floor.walls.map((w) => [w.id, w]));
    const openingsByWall = new Map<string, typeof floor.openings>();
    for (const o of floor.openings) {
      const arr = openingsByWall.get(o.wallId) ?? [];
      arr.push(o);
      openingsByWall.set(o.wallId, arr);
    }

    for (const wall of floor.walls) {
      allPts.push(wall.start, wall.end);
      const dir = wallDirection(wall);
      const theta = Math.atan2(dir[1], dir[0]);
      const wallOpenings = (openingsByWall.get(wall.id) ?? []).map((o) => ({
        offset: o.offset,
        width: o.width,
        height: o.height,
        sillHeight: o.sillHeight,
      }));
      const segs = wallBoxes(wall, wallOpenings, wall.height);
      segs.forEach((s, i) => {
        const along = (s.along0 + s.along1) / 2;
        const px = wall.start[0] + dir[0] * along;
        const py = wall.start[1] + dir[1] * along;
        boxes.push({
          key: `${wall.id}-${i}`,
          entityId: wall.id,
          floorId: floor.id,
          kind: "wall",
          position: [px, elevation + (s.z0 + s.z1) / 2, py],
          rotationY: -theta,
          size: [Math.max(s.along1 - s.along0, 0.001), Math.max(s.z1 - s.z0, 0.001), wall.thickness],
          materialId: wall.materialId,
        });
      });
    }

    for (const o of floor.openings) {
      const wall = wallById.get(o.wallId);
      if (!wall) continue;
      const dir = wallDirection(wall);
      const theta = Math.atan2(dir[1], dir[0]);
      const px = wall.start[0] + dir[0] * o.offset;
      const py = wall.start[1] + dir[1] * o.offset;
      const depth = o.type === "window" ? 0.05 : wall.thickness * 0.6;
      panels.push({
        key: o.id,
        entityId: o.id,
        floorId: floor.id,
        kind: o.type,
        position: [px, elevation + o.sillHeight + o.height / 2, py],
        rotationY: -theta,
        size: [Math.max(o.width - 0.04, 0.05), Math.max(o.height - 0.04, 0.05), depth],
      });
    }

    for (const ob of floor.objects) {
      const d = furnitureDims(ob.type, ob.scale);
      objects.push({
        key: ob.id,
        entityId: ob.id,
        floorId: floor.id,
        kind: "object",
        objectType: ob.type,
        position: [ob.position[0], elevation + ob.position[2] + d.height / 2, ob.position[1]],
        rotationY: -ob.rotation[2],
        size: [d.width, d.height, d.depth],
      });
    }

    if (opts.showSlabs !== false && floor.walls.length > 0) {
      const b = bounds(floor.walls.flatMap((w) => [w.start, w.end]));
      slabs.push({
        key: `slab-${floor.id}`,
        entityId: floor.id,
        floorId: floor.id,
        kind: "slab",
        position: [(b.min[0] + b.max[0]) / 2, elevation - SLAB_THICKNESS / 2, (b.min[1] + b.max[1]) / 2],
        size: [b.width + 0.4, SLAB_THICKNESS, b.height + 0.4],
      });
    }
  });

  const b = bounds(allPts);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[1] + b.max[1]) / 2;
  const cy = Number.isFinite(minY) ? (minY + maxY) / 2 : 1.5;
  const radius = Math.max(b.width, b.height, maxY - minY, 4) * 0.75;
  return { boxes, slabs, panels, objects, center: [cx, cy, cz], radius };
}
