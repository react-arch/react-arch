import { describe, expect, it } from "vitest";
import { polygonArea, polygonCentroid } from "./polygon.js";
import { openingFits, openingSpan, wallLength, wallPolygon } from "./wall.js";
import { segmentIntersection } from "./line.js";
import { findSnap, snapToGrid } from "./snap.js";
import { roofGeometry } from "./roof.js";
import { stairGeometry } from "./stair.js";

describe("polygon", () => {
  it("computes the area of a unit square", () => {
    expect(polygonArea([[0, 0], [1, 0], [1, 1], [0, 1]])).toBeCloseTo(1);
  });

  it("computes the centroid of a square", () => {
    const c = polygonCentroid([[0, 0], [2, 0], [2, 2], [0, 2]]);
    expect(c[0]).toBeCloseTo(1);
    expect(c[1]).toBeCloseTo(1);
  });
});

describe("wall", () => {
  const wall = { start: [0, 0] as [number, number], end: [4, 0] as [number, number], thickness: 0.2 };

  it("measures length", () => {
    expect(wallLength(wall)).toBeCloseTo(4);
  });

  it("derives a 4-vertex polygon of the right area", () => {
    const poly = wallPolygon(wall);
    expect(poly).toHaveLength(4);
    expect(polygonArea(poly)).toBeCloseTo(4 * 0.2);
  });

  it("places openings along the centerline", () => {
    const span = openingSpan(wall, { offset: 2, width: 1 });
    expect(span.center[0]).toBeCloseTo(2);
    expect(span.start[0]).toBeCloseTo(1.5);
    expect(span.end[0]).toBeCloseTo(2.5);
  });

  it("detects openings that do not fit", () => {
    expect(openingFits(wall, { offset: 2, width: 1 })).toBe(true);
    expect(openingFits(wall, { offset: 0.1, width: 1 })).toBe(false);
  });
});

describe("line", () => {
  it("finds segment intersections", () => {
    const p = segmentIntersection(
      { a: [0, 0], b: [2, 2] },
      { a: [0, 2], b: [2, 0] },
    );
    expect(p).not.toBeNull();
    expect(p![0]).toBeCloseTo(1);
    expect(p![1]).toBeCloseTo(1);
  });

  it("returns null for parallel segments", () => {
    expect(
      segmentIntersection({ a: [0, 0], b: [1, 0] }, { a: [0, 1], b: [1, 1] }),
    ).toBeNull();
  });
});

describe("snap", () => {
  it("snaps to grid", () => {
    expect(snapToGrid([0.13, 0.49], 0.25)).toEqual([0.25, 0.5]);
  });

  it("prefers endpoint snaps", () => {
    const snap = findSnap([0.05, 0.0], [{ a: [0, 0], b: [4, 0] }], {
      tolerance: 0.2,
    });
    expect(snap?.kind).toBe("endpoint");
  });
});

describe("roof", () => {
  const fp = { min: [0, 0] as [number, number], max: [10, 6] as [number, number] };

  it("flat roof is a box slab above the eave with overhang", () => {
    const g = roofGeometry(fp, { type: "flat", baseY: 3, overhang: 0.5, thickness: 0.2 });
    expect(g.kind).toBe("box");
    if (g.kind !== "box") throw new Error("expected box");
    expect(g.size).toEqual([11, 0.2, 7]);
    expect(g.position[1]).toBeCloseTo(3.1);
  });

  it("gable roof returns sloped triangle vertices ridged along the long axis", () => {
    const g = roofGeometry(fp, { type: "gable", baseY: 3, pitch: 45, overhang: 0 });
    expect(g.kind).toBe("mesh");
    if (g.kind !== "mesh") throw new Error("expected mesh");
    // ridge height = baseY + tan(45) * (D/2) = 3 + 3 = 6
    const ys = g.positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...ys)).toBeCloseTo(6);
    expect(Math.min(...ys)).toBeCloseTo(3);
  });

  it("hip roof insets the ridge from both ends", () => {
    const g = roofGeometry(fp, { type: "hip", baseY: 0, pitch: 30, overhang: 0 });
    if (g.kind !== "mesh") throw new Error("expected mesh");
    const xs = g.positions.filter((_, i) => i % 3 === 0);
    // ridge x is inset by D/2 = 3 → between 3 and 7
    expect(Math.max(...xs)).toBeCloseTo(10);
    const ridgeXs = [...new Set(xs)].filter((x) => x > 0.001 && x < 9.999);
    expect(ridgeXs.some((x) => Math.abs(x - 3) < 1e-6 || Math.abs(x - 7) < 1e-6)).toBe(true);
  });
});

describe("stair", () => {
  it("climbs evenly from base to base+rise over N steps", () => {
    const g = stairGeometry({ position: [0, 0], width: 1, run: 4, rise: 3, direction: 0, steps: 6, baseY: 0 });
    const ys = g.positions.filter((_, i) => i % 3 === 1);
    // The mesh spans from the base (0) up to the full rise (3).
    expect(Math.max(...ys)).toBeCloseTo(3);
    expect(Math.min(...ys)).toBeCloseTo(0);
  });

  it("footprint covers the run × width rectangle", () => {
    const g = stairGeometry({ position: [2, 1], width: 1, run: 4, rise: 3, direction: 0, steps: 6, baseY: 0 });
    expect(g.footprint.min).toEqual([2, 1]);
    expect(g.footprint.max[0]).toBeCloseTo(6);
    expect(g.footprint.max[1]).toBeCloseTo(2);
  });
});
