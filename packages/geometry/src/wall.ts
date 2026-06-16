import { type Vec2 } from "@react-arch/shared";
import { add, distance, normal, normalize, scale, sub } from "./vec2.js";

export interface WallLike {
  start: Vec2;
  end: Vec2;
  thickness: number;
}

export function wallLength(wall: WallLike): number {
  return distance(wall.start, wall.end);
}

export function wallDirection(wall: WallLike): Vec2 {
  return normalize(sub(wall.end, wall.start));
}

/**
 * Generate the visible quad polygon of a wall from its centerline and
 * thickness. Vertices are ordered counter-clockwise.
 */
export function wallPolygon(wall: WallLike, extendEnds = 0): Vec2[] {
  const dir = wallDirection(wall);
  const n = normal(dir);
  const half = wall.thickness / 2;
  const offset = scale(n, half);
  const negOffset = scale(n, -half);
  // Push the ends out along the wall direction so corners overlap (no notch).
  const start = add(wall.start, scale(dir, -extendEnds));
  const end = add(wall.end, scale(dir, extendEnds));
  return [
    add(start, negOffset),
    add(end, negOffset),
    add(end, offset),
    add(start, offset),
  ];
}

/** World position of a point at distance `offset` along the wall centerline. */
export function pointAlongWall(wall: WallLike, offset: number): Vec2 {
  const dir = wallDirection(wall);
  return add(wall.start, scale(dir, offset));
}

export interface OpeningLike {
  offset: number;
  width: number;
}

/**
 * The two centerline endpoints of an opening cut, clamped to the wall length.
 */
export function openingSpan(
  wall: WallLike,
  opening: OpeningLike,
): { start: Vec2; end: Vec2; center: Vec2 } {
  const len = wallLength(wall);
  const half = opening.width / 2;
  const start = Math.max(0, opening.offset - half);
  const end = Math.min(len, opening.offset + half);
  return {
    start: pointAlongWall(wall, start),
    end: pointAlongWall(wall, end),
    center: pointAlongWall(wall, opening.offset),
  };
}

/** Whether an opening fits entirely within the wall it is attached to. */
export function openingFits(wall: WallLike, opening: OpeningLike): boolean {
  const len = wallLength(wall);
  return (
    opening.offset - opening.width / 2 >= -1e-6 &&
    opening.offset + opening.width / 2 <= len + 1e-6
  );
}

export interface WallOpeningInput extends OpeningLike {
  /** Bottom of the opening above the floor. */
  sillHeight: number;
  /** Opening height. */
  height: number;
}

/**
 * A solid box of the wall expressed in wall-local coordinates: `along` runs
 * from the wall start, `z` is vertical. The 3D renderer extrudes each box by
 * the wall thickness. This is how openings are "cut" without CSG — the wall is
 * decomposed into the solid pieces that remain around its openings.
 */
export interface WallBox {
  along0: number;
  along1: number;
  z0: number;
  z1: number;
}

export function wallBoxes(
  wall: WallLike,
  openings: WallOpeningInput[],
  wallHeight: number,
  /**
   * Extend the solid wall by this much past each end. Pass `thickness / 2` so
   * walls meeting at a corner overlap and fill the corner square — otherwise
   * each centerline box stops short and leaves a notch.
   */
  extendEnds = 0,
): WallBox[] {
  const len = wallLength(wall);
  const lo = -extendEnds;
  const hi = len + extendEnds;
  if (openings.length === 0) {
    return [{ along0: lo, along1: hi, z0: 0, z1: wallHeight }];
  }
  const sorted = [...openings]
    .map((o) => ({
      a0: Math.max(0, o.offset - o.width / 2),
      a1: Math.min(len, o.offset + o.width / 2),
      sill: Math.max(0, o.sillHeight),
      top: Math.min(wallHeight, o.sillHeight + o.height),
    }))
    .sort((a, b) => a.a0 - b.a0);

  const boxes: WallBox[] = [];
  let cursor = lo;
  for (const o of sorted) {
    if (o.a0 > cursor) {
      boxes.push({ along0: cursor, along1: o.a0, z0: 0, z1: wallHeight });
    }
    // Lintel above the opening.
    if (o.top < wallHeight) {
      boxes.push({ along0: o.a0, along1: o.a1, z0: o.top, z1: wallHeight });
    }
    // Sill below the opening (windows).
    if (o.sill > 0) {
      boxes.push({ along0: o.a0, along1: o.a1, z0: 0, z1: o.sill });
    }
    cursor = Math.max(cursor, o.a1);
  }
  if (cursor < hi) {
    boxes.push({ along0: cursor, along1: hi, z0: 0, z1: wallHeight });
  }
  return boxes;
}
