import { EPSILON, type Vec2 } from "@react-arch/shared";
import { cross, sub } from "./vec2.js";

export interface Segment {
  a: Vec2;
  b: Vec2;
}

/**
 * Intersection of two infinite lines defined by segments. Returns null when
 * the lines are parallel (within EPSILON).
 */
export function lineIntersection(s1: Segment, s2: Segment): Vec2 | null {
  const r = sub(s1.b, s1.a);
  const s = sub(s2.b, s2.a);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPSILON) return null; // parallel
  const qp = sub(s2.a, s1.a);
  const t = cross(qp, s) / denom;
  return [s1.a[0] + t * r[0], s1.a[1] + t * r[1]];
}

/**
 * Intersection point of two finite segments, or null if they don't cross.
 */
export function segmentIntersection(s1: Segment, s2: Segment): Vec2 | null {
  const r = sub(s1.b, s1.a);
  const s = sub(s2.b, s2.a);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPSILON) return null;
  const qp = sub(s2.a, s1.a);
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) {
    return null;
  }
  return [s1.a[0] + t * r[0], s1.a[1] + t * r[1]];
}
