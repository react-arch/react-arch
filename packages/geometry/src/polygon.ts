import { type Vec2 } from "@react-arch/shared";

/** Signed area (positive = counter-clockwise winding). */
export function signedArea(polygon: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

export function polygonArea(polygon: Vec2[]): number {
  return Math.abs(signedArea(polygon));
}

export function polygonCentroid(polygon: Vec2[]): Vec2 {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p0 = polygon[i]!;
    const p1 = polygon[(i + 1) % polygon.length]!;
    const f = p0[0] * p1[1] - p1[0] * p0[1];
    cx += (p0[0] + p1[0]) * f;
    cy += (p0[1] + p1[1]) * f;
    a += f;
  }
  if (Math.abs(a) < 1e-9) {
    // Degenerate polygon: fall back to vertex average.
    const n = polygon.length || 1;
    return [
      polygon.reduce((s, p) => s + p[0], 0) / n,
      polygon.reduce((s, p) => s + p[1], 0) / n,
    ];
  }
  a *= 3;
  return [cx / a, cy / a];
}

export function isClockwise(polygon: Vec2[]): boolean {
  return signedArea(polygon) < 0;
}

export function ensureCounterClockwise(polygon: Vec2[]): Vec2[] {
  return isClockwise(polygon) ? [...polygon].reverse() : polygon;
}

/** Axis-aligned bounding box of a set of points. */
export function bounds(points: Vec2[]): {
  min: Vec2;
  max: Vec2;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { min: [0, 0], max: [0, 0], width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    min: [minX, minY],
    max: [maxX, maxY],
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  const [px, py] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const intersect =
      a[1] > py !== b[1] > py &&
      px < ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0];
    if (intersect) inside = !inside;
  }
  return inside;
}
