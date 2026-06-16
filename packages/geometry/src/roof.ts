import type { Vec2 } from "@react-arch/shared";

export interface RoofFootprint {
  min: Vec2;
  max: Vec2;
}

export interface RoofParams {
  type: "flat" | "gable" | "hip";
  /** World Y at the eave (top of the walls). */
  baseY: number;
  pitch?: number; // degrees
  overhang?: number; // metres
  thickness?: number; // flat-roof slab thickness
}

/** Roof geometry in world space (plan X → X, plan Y → Z, up → Y). */
export type RoofGeometry =
  | { kind: "box"; position: [number, number, number]; size: [number, number, number] }
  | { kind: "mesh"; positions: number[] };

type V3 = [number, number, number];

/**
 * Derive roof geometry from a rectangular footprint. Sloped roofs return raw
 * triangle vertices (the renderer computes normals and uses a double-sided
 * material, so winding doesn't matter).
 */
export function roofGeometry(fp: RoofFootprint, p: RoofParams): RoofGeometry {
  const ox = p.overhang ?? 0.3;
  const minX = fp.min[0] - ox;
  const maxX = fp.max[0] + ox;
  const minZ = fp.min[1] - ox;
  const maxZ = fp.max[1] + ox;
  const W = maxX - minX;
  const D = maxZ - minZ;
  const baseY = p.baseY;

  if (p.type === "flat") {
    const th = p.thickness ?? 0.3;
    return {
      kind: "box",
      position: [(minX + maxX) / 2, baseY + th / 2, (minZ + maxZ) / 2],
      size: [Math.max(W, 0.01), th, Math.max(D, 0.01)],
    };
  }

  const pitch = ((p.pitch ?? 30) * Math.PI) / 180;
  const tri: number[] = [];
  const push = (a: V3, b: V3, c: V3) => tri.push(...a, ...b, ...c);
  const quad = (a: V3, b: V3, c: V3, d: V3) => {
    push(a, b, c);
    push(a, c, d);
  };

  const A: V3 = [minX, baseY, minZ];
  const B: V3 = [maxX, baseY, minZ];
  const C: V3 = [maxX, baseY, maxZ];
  const Dd: V3 = [minX, baseY, maxZ];

  if (W >= D) {
    // Ridge runs along X.
    const cz = (minZ + maxZ) / 2;
    const ry = baseY + Math.tan(pitch) * (D / 2);
    const inset = p.type === "hip" ? D / 2 : 0;
    const R0: V3 = [minX + inset, ry, cz];
    const R1: V3 = [maxX - inset, ry, cz];
    quad(A, B, R1, R0); // front slope
    quad(C, Dd, R0, R1); // back slope
    if (p.type === "hip") {
      push(Dd, A, R0); // west hip
      push(B, C, R1); // east hip
    } else {
      push(A, Dd, R0); // west gable
      push(C, B, R1); // east gable
    }
  } else {
    // Ridge runs along Z.
    const cx = (minX + maxX) / 2;
    const ry = baseY + Math.tan(pitch) * (W / 2);
    const inset = p.type === "hip" ? W / 2 : 0;
    const R0: V3 = [cx, ry, minZ + inset];
    const R1: V3 = [cx, ry, maxZ - inset];
    quad(A, R0, R1, Dd); // west slope
    quad(B, C, R1, R0); // east slope
    if (p.type === "hip") {
      push(A, B, R0); // north hip
      push(C, Dd, R1); // south hip
    } else {
      push(B, A, R0); // north gable
      push(Dd, C, R1); // south gable
    }
  }

  return { kind: "mesh", positions: tri };
}
