import { describe, expect, it } from "vitest";
import type { BuildingDocument } from "@react-arch/core";
import { build3DScene } from "./scene3d.js";

const doc: BuildingDocument = {
  id: "doc",
  version: "0.1.0",
  name: "Scene",
  units: "metric",
  buildings: [
    {
      id: "b1",
      name: "Building",
      floors: [
        {
          id: "f1",
          buildingId: "b1",
          name: "Ground",
          elevation: 0,
          height: 2.8,
          visible: true,
          locked: false,
          walls: [{ id: "w1", floorId: "f1", start: [0, 0], end: [4, 0], thickness: 0.2, height: 2.8 }],
          rooms: [],
          openings: [{ id: "passage", floorId: "f1", wallId: "w1", type: "opening", offset: 2, width: 1, height: 2.1, sillHeight: 0 }],
          objects: [{ id: "sofa", floorId: "f1", type: "sofa", position: [8, 6, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
          stairs: [],
        },
      ],
    },
  ],
  materials: [],
  assets: [],
  metadata: {},
};

describe("build3DScene", () => {
  it("leaves generic openings empty", () => {
    expect(build3DScene(doc, { floorIds: "all" }).panels).toEqual([]);
  });

  it("includes objects in scene bounds", () => {
    const scene = build3DScene(doc, { floorIds: "all" });
    expect(scene.objects).toHaveLength(1);
    expect(scene.center[0]).toBeGreaterThan(3);
    expect(scene.center[2]).toBeGreaterThan(2);
  });
});
