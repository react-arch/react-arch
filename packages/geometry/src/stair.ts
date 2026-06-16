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

/** A single step, ready to drop onto a mesh (plan X → X, plan Y → Z, up → Y). */
export interface StairStep {
  /** Centre of the step box. */
  position: [number, number, number];
  /** Box dimensions [alongRun, height, width]. */
  size: [number, number, number];
}

export interface StairGeometry {
  steps: StairStep[];
  /** Plan footprint the flight occupies (for slab voids / overlap checks). */
  footprint: { min: Vec2; max: Vec2 };
}

/**
 * Build a straight-run stair as a stack of step boxes. Each tread is a riser
 * tall box; step `i` rises by `(i+1) * riserHeight` and its top reaches that
 * height, so the flight climbs evenly from `baseY` to `baseY + rise`.
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

  const out: StairStep[] = [];
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * riser;
    // Centre of this step's tread along the run.
    const along = (i + 0.5) * tread;
    const cx = p.position[0] + dx * along + nx * (p.width / 2);
    const cy = p.position[1] + dy * along + ny * (p.width / 2);
    out.push({
      position: [cx, p.baseY + top / 2, cy],
      size: [tread, top, p.width],
    });
  }

  // Footprint corners (the run rectangle).
  const ex = p.position[0] + dx * p.run + nx * p.width;
  const ey = p.position[1] + dy * p.run + ny * p.width;
  const xs = [p.position[0], p.position[0] + dx * p.run, p.position[0] + nx * p.width, ex];
  const ys = [p.position[1], p.position[1] + dy * p.run, p.position[1] + ny * p.width, ey];
  return {
    steps: out,
    footprint: {
      min: [Math.min(...xs), Math.min(...ys)],
      max: [Math.max(...xs), Math.max(...ys)],
    },
  };
}
