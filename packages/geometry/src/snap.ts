import { type Vec2 } from "@react-arch/shared";
import { distance, lerp } from "./vec2.js";
import { projectPointOnSegment } from "./vec2.js";

export type SnapKind = "endpoint" | "midpoint" | "grid" | "perpendicular";

export interface SnapResult {
  point: Vec2;
  kind: SnapKind;
  distance: number;
}

export interface SnapSegment {
  a: Vec2;
  b: Vec2;
}

export function snapToGrid(point: Vec2, gridSize: number): Vec2 {
  if (gridSize <= 0) return point;
  return [
    Math.round(point[0] / gridSize) * gridSize,
    Math.round(point[1] / gridSize) * gridSize,
  ];
}

/**
 * Find the best snap candidate near `point`. Endpoint and midpoint snaps take
 * priority over grid snaps within the given pixel/world tolerance.
 */
export function findSnap(
  point: Vec2,
  segments: SnapSegment[],
  options: { tolerance: number; gridSize?: number } = { tolerance: 0.2 },
): SnapResult | null {
  const candidates: SnapResult[] = [];
  for (const seg of segments) {
    for (const ep of [seg.a, seg.b]) {
      const d = distance(point, ep);
      if (d <= options.tolerance) {
        candidates.push({ point: ep, kind: "endpoint", distance: d });
      }
    }
    const mid = lerp(seg.a, seg.b, 0.5);
    const dm = distance(point, mid);
    if (dm <= options.tolerance) {
      candidates.push({ point: mid, kind: "midpoint", distance: dm });
    }
    const proj = projectPointOnSegment(point, seg.a, seg.b);
    if (proj.distance <= options.tolerance) {
      candidates.push({
        point: proj.point,
        kind: "perpendicular",
        distance: proj.distance,
      });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const rank: Record<SnapKind, number> = {
        endpoint: 0,
        midpoint: 1,
        perpendicular: 2,
        grid: 3,
      };
      if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];
      return a.distance - b.distance;
    });
    return candidates[0]!;
  }

  if (options.gridSize) {
    const gp = snapToGrid(point, options.gridSize);
    return { point: gp, kind: "grid", distance: distance(point, gp) };
  }
  return null;
}
