import { describe, expect, it } from "vitest";
import { hitTest, type PlanScene } from "./scene.js";

describe("hitTest", () => {
  it("tests openings against their drawn segment", () => {
    const scene: PlanScene = {
      walls: [],
      rooms: [],
      objects: [],
      openings: [{ id: "o1", floorId: "f1", type: "opening", p0: [0, 0], p1: [2, 0], center: [1, 0], dir: [1, 0], normal: [0, 1], width: 2 }],
    };

    expect(hitTest(scene, [1, 0.9], 0.1)).toBeNull();
    expect(hitTest(scene, [1, 0.05], 0.1)).toEqual({ kind: "opening", id: "o1" });
  });

  it("accounts for furniture rotation", () => {
    const scene: PlanScene = {
      walls: [],
      rooms: [],
      openings: [],
      objects: [{ id: "chair", floorId: "f1", type: "chair", center: [0, 0], size: [2, 1], rotation: Math.PI / 2 }],
    };

    expect(hitTest(scene, [0, 0.9], 0.01)).toEqual({ kind: "object", id: "chair" });
  });
});
