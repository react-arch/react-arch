import type { BuildingDocument } from "@react-arch/core";
import { allFloors, furnitureDims } from "@react-arch/core";
import { bounds, roofGeometry, stairGeometry, wallBoxes, wallDirection, type RoofGeometry, type Vec2 } from "@react-arch/geometry";

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
  /** Outer outline in plan coords (x, y). */
  outline: Vec2[];
  /** Stairwell voids (plan polygons) cut out of the slab. */
  holes: Vec2[][];
  /** World Y of the slab top. */
  topY: number;
  thickness: number;
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

export interface RoofMesh {
  key: string;
  entityId: string;
  buildingId: string;
  kind: "roof";
  geometry: RoofGeometry;
  materialId?: string;
}

/** A stair flight as a single triangle mesh (raw vertex positions). */
export interface StairMesh {
  key: string;
  entityId: string;
  floorId: string;
  kind: "stair";
  positions: number[];
  materialId?: string;
}

export interface Scene3D {
  boxes: BoxMesh[];
  slabs: SlabMesh[];
  panels: PanelMesh[];
  objects: ObjectMesh[];
  stairs: StairMesh[];
  roofs: RoofMesh[];
  center: [number, number, number];
  radius: number;
  /** Y of the lowest floor — used to ground contact shadows. */
  floorY: number;
}

export interface Build3DOptions {
  floorIds: string[] | "all";
  exploded?: boolean;
  explodeGap?: number;
  showSlabs?: boolean;
}

/** A rectangular stairwell void, enlarged by a small margin and clipped to the slab. */
function clampRect(min: Vec2, max: Vec2, x0: number, x1: number, z0: number, z1: number): Vec2[] {
  const m = 0.06;
  const ax = Math.max(x0, min[0] - m), bx = Math.min(x1, max[0] + m);
  const az = Math.max(z0, min[1] - m), bz = Math.min(z1, max[1] + m);
  return [[ax, az], [bx, az], [bx, bz], [ax, bz]];
}

const SLAB_THICKNESS = 0.14;
/** Drop the slab top slightly below the floor line to avoid sharing a plane
 * with the wall-tops of the floor below (prevents z-fighting). 2 cm, invisible. */
const SLAB_TOP_GAP = 0.02;

export function build3DScene(doc: BuildingDocument, opts: Build3DOptions): Scene3D {
  const floors = allFloors(doc);
  const ordered = [...floors].sort((a, b) => a.elevation - b.elevation);
  const gap = opts.explodeGap ?? 3;

  const boxes: BoxMesh[] = [];
  const slabs: SlabMesh[] = [];
  const panels: PanelMesh[] = [];
  const objects: ObjectMesh[] = [];
  const stairs: StairMesh[] = [];
  const roofs: RoofMesh[] = [];
  const allPts: Vec2[] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  const addPlanRect = (cx: number, cz: number, width: number, depth: number) => {
    allPts.push([cx - width / 2, cz - depth / 2], [cx + width / 2, cz + depth / 2]);
  };

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
      // Extend each end by half-thickness so walls overlap and fill corners.
      const segs = wallBoxes(wall, wallOpenings, wall.height, wall.thickness / 2);
      segs.forEach((s, i) => {
        const along = (s.along0 + s.along1) / 2;
        const px = wall.start[0] + dir[0] * along;
        const py = wall.start[1] + dir[1] * along;
        const size: [number, number, number] = [Math.max(s.along1 - s.along0, 0.001), Math.max(s.z1 - s.z0, 0.001), wall.thickness];
        addPlanRect(px, py, size[0], size[2]);
        minY = Math.min(minY, elevation + s.z0);
        maxY = Math.max(maxY, elevation + s.z1);
        boxes.push({
          key: `${wall.id}-${i}`,
          entityId: wall.id,
          floorId: floor.id,
          kind: "wall",
          position: [px, elevation + (s.z0 + s.z1) / 2, py],
          rotationY: -theta,
          size,
          materialId: wall.materialId,
        });
      });
    }

    for (const o of floor.openings) {
      if (o.type === "opening") continue;
      const wall = wallById.get(o.wallId);
      if (!wall) continue;
      const dir = wallDirection(wall);
      const theta = Math.atan2(dir[1], dir[0]);
      const px = wall.start[0] + dir[0] * o.offset;
      const py = wall.start[1] + dir[1] * o.offset;
      const depth = o.type === "window" ? 0.05 : wall.thickness * 0.6;
      const size: [number, number, number] = [Math.max(o.width - 0.04, 0.05), Math.max(o.height - 0.04, 0.05), depth];
      addPlanRect(px, py, size[0], size[2]);
      minY = Math.min(minY, elevation + o.sillHeight);
      maxY = Math.max(maxY, elevation + o.sillHeight + o.height);
      panels.push({
        key: o.id,
        entityId: o.id,
        floorId: floor.id,
        kind: o.type,
        position: [px, elevation + o.sillHeight + o.height / 2, py],
        rotationY: -theta,
        size,
      });
    }

    for (const ob of floor.objects) {
      const d = furnitureDims(ob.type, ob.scale);
      addPlanRect(ob.position[0], ob.position[1], d.width, d.depth);
      minY = Math.min(minY, elevation + ob.position[2]);
      maxY = Math.max(maxY, elevation + ob.position[2] + d.height);
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

    for (const st of floor.stairs) {
      const g = stairGeometry({
        position: st.position,
        width: st.width,
        run: st.run,
        rise: st.rise,
        direction: st.direction,
        steps: st.steps,
        baseY: elevation,
      });
      addPlanRect(
        (g.footprint.min[0] + g.footprint.max[0]) / 2,
        (g.footprint.min[1] + g.footprint.max[1]) / 2,
        g.footprint.max[0] - g.footprint.min[0],
        g.footprint.max[1] - g.footprint.min[1],
      );
      maxY = Math.max(maxY, elevation + st.rise);
      stairs.push({
        key: st.id,
        entityId: st.id,
        floorId: floor.id,
        kind: "stair",
        positions: g.positions,
        materialId: st.materialId,
      });
    }

    if (opts.showSlabs !== false && floor.walls.length > 0) {
      const b = bounds(floor.walls.flatMap((w) => [w.start, w.end]));
      // Extend to the outer wall face (~half a wall thickness), so the floor
      // sits flush with the walls instead of overhanging as a ledge.
      const x0 = b.min[0] - 0.1, x1 = b.max[0] + 0.1, z0 = b.min[1] - 0.1, z1 = b.max[1] + 0.1;
      const outline: Vec2[] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      // Cut a stairwell void where a stair on the floor below arrives here.
      const holes: Vec2[][] = [];
      for (const g of floors) {
        if (g === floor || Math.abs(g.elevation + g.height - floor.elevation) > 0.3) continue;
        for (const st of g.stairs) {
          const fp = stairGeometry({
            position: st.position, width: st.width, run: st.run, rise: st.rise,
            direction: st.direction, steps: st.steps, baseY: 0,
          }).footprint;
          holes.push(clampRect(fp.min, fp.max, x0, x1, z0, z1));
        }
      }
      slabs.push({
        key: `slab-${floor.id}`,
        entityId: floor.id,
        floorId: floor.id,
        kind: "slab",
        outline,
        holes,
        // Sit the slab top SLAB_TOP_GAP below the floor line so it is never
        // coplanar with the tops of the walls of the floor below (which reach
        // exactly this elevation) — the root cause of the z-fighting seam.
        topY: elevation - SLAB_TOP_GAP,
        thickness: SLAB_THICKNESS,
      });
    }
  });

  // Roofs cap a building's top visible floor, or a specific floor via floorId.
  for (const building of doc.buildings) {
    if (!building.roofs?.length) continue;
    const bFloors = building.floors.filter((f) =>
      opts.floorIds === "all" ? f.visible : opts.floorIds.includes(f.id),
    );
    if (bFloors.length === 0) continue;
    const topYof = (floorsForRoof: typeof bFloors) => {
      let topY = -Infinity;
      let pts: Vec2[] = [];
      for (const f of floorsForRoof) {
        const idx = ordered.indexOf(f);
        const eff = f.elevation + (opts.exploded ? idx * gap : 0);
        topY = Math.max(topY, eff + f.height);
        pts = pts.concat(f.walls.flatMap((w) => [w.start, w.end]));
      }
      return { topY, pts };
    };
    for (const roof of building.roofs) {
      const target = roof.floorId ? bFloors.filter((f) => f.id === roof.floorId) : bFloors;
      if (target.length === 0) continue;
      const { topY, pts } = topYof(target);
      if (pts.length === 0) continue;
      const fb = bounds(pts);
      const geometry = roofGeometry(
        { min: fb.min, max: fb.max },
        { type: roof.type, baseY: topY, pitch: roof.pitch, overhang: roof.overhang, thickness: roof.thickness },
      );
      roofs.push({ key: `roof-${roof.id}`, entityId: roof.id, buildingId: building.id, kind: "roof", geometry, materialId: roof.materialId });
      if (geometry.kind === "box") maxY = Math.max(maxY, geometry.position[1] + geometry.size[1] / 2);
      else for (let i = 1; i < geometry.positions.length; i += 3) maxY = Math.max(maxY, geometry.positions[i]!);
    }
  }

  const b = bounds(allPts);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[1] + b.max[1]) / 2;
  const cy = Number.isFinite(minY) ? (minY + maxY) / 2 : 1.5;
  const radius = Math.max(b.width, b.height, maxY - minY, 4) * 0.75;
  return { boxes, slabs, panels, objects, stairs, roofs, center: [cx, cy, cz], radius, floorY: Number.isFinite(minY) ? minY : 0 };
}
