import { EPSILON, type Vec2 } from "@react-arch/shared";

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
export const dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];
export const cross = (a: Vec2, b: Vec2): number => a[0] * b[1] - a[1] * b[0];
export const length = (a: Vec2): number => Math.hypot(a[0], a[1]);
export const distance = (a: Vec2, b: Vec2): number => length(sub(a, b));

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len < EPSILON) return [0, 0];
  return [a[0] / len, a[1] / len];
}

/** Left-hand normal of a vector (rotate +90°). */
export function normal(a: Vec2): Vec2 {
  return [-a[1], a[0]];
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function angle(a: Vec2, b: Vec2): number {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

export function equals(a: Vec2, b: Vec2, eps = EPSILON): boolean {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;
}

/** Project point p onto the segment [a,b], returning the closest point + t. */
export function projectPointOnSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
): { point: Vec2; t: number; distance: number } {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 < EPSILON) return { point: a, t: 0, distance: distance(p, a) };
  let t = dot(sub(p, a), ab) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = add(a, scale(ab, t));
  return { point, t, distance: distance(p, point) };
}
