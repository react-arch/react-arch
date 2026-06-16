import type { Vec2 } from "@react-arch/shared";

export interface StairParams {
  /** Plan position of the bottom-start corner (metres). */
  position: Vec2;
  /** Width across the treads. */
  width: number;
  /** Total plan run along the travel direction. */
  run: number;
  /** Total vertical rise. */
  rise: number;
  /** Travel direction, radians (0 = +X, increasing clockwise as plan Y grows down). */
  direction: number;
  /** Number of treads. */
  steps: number;
  /** World Y at the bottom of the flight (the floor the stair sits on). */
  baseY: number;
}

export interface StairGeometry {
  /** Raw triangle vertices (plan X → X, plan Y → Z, up → Y). One watertight solid. */
  positions: number[];
  /** Plan footprint the flight occupies (for slab voids / overlap checks). */
  footprint: { min: Vec2; max: Vec2 };
}

/**
 * Build a straight-run stair as a single triangle mesh: the stepped top
 * surface (alternating treads and risers) plus the two side silhouettes. The
 * faces tile the staircase without overlapping, so — unlike a stack of solid
 * boxes — there are no coplanar faces to z-fight. The renderer computes normals
 * and uses a double-sided material, so winding doesn't matter.
 */
export function stairGeometry(p: StairParams): StairGeometry {
  const steps = Math.max(2, Math.round(p.steps));
  const riser = p.rise / steps;
  const tread = p.run / steps;
  const dx = Math.cos(p.direction);
  const dy = Math.sin(p.direction);
  // Perpendicular (width) axis in the plan.
  const nx = -dy;
  const ny = dx;

  type V3 = [number, number, number];
  // Map a (run, width, height) sample to world space.
  const P = (s: number, u: number, h: number): V3 => [
    p.position[0] + dx * s + nx * u,
    p.baseY + h,
    p.position[1] + dy * s + ny * u,
  ];

  const tri: number[] = [];
  const push = (a: V3, b: V3, c: V3) => tri.push(...a, ...b, ...c);
  const quad = (a: V3, b: V3, c: V3, d: V3) => {
    push(a, b, c);
    push(a, c, d);
  };

  for (let i = 0; i < steps; i++) {
    const s0 = i * tread;
    const s1 = (i + 1) * tread;
    const h0 = i * riser;
    const h1 = (i + 1) * riser;

    // Riser face (vertical) across the full width.
    quad(P(s0, 0, h0), P(s0, p.width, h0), P(s0, p.width, h1), P(s0, 0, h1));
    // Tread face (horizontal) across the full width.
    quad(P(s0, 0, h1), P(s1, 0, h1), P(s1, p.width, h1), P(s0, p.width, h1));
    // Side silhouette columns (each step is a disjoint rectangle → no overlap).
    quad(P(s0, 0, 0), P(s1, 0, 0), P(s1, 0, h1), P(s0, 0, h1));
    quad(P(s0, p.width, 0), P(s1, p.width, 0), P(s1, p.width, h1), P(s0, p.width, h1));
  }

  // Footprint corners (the run rectangle).
  const ex = p.position[0] + dx * p.run + nx * p.width;
  const ey = p.position[1] + dy * p.run + ny * p.width;
  const xs = [p.position[0], p.position[0] + dx * p.run, p.position[0] + nx * p.width, ex];
  const ys = [p.position[1], p.position[1] + dy * p.run, p.position[1] + ny * p.width, ey];
  return {
    positions: tri,
    footprint: {
      min: [Math.min(...xs), Math.min(...ys)],
      max: [Math.max(...xs), Math.max(...ys)],
    },
  };
}
