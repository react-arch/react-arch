import { describe, expect, it } from "vitest";
import type { BuildingDocument } from "@react-arch/core";
import { buildExportScene } from "./gltf.js";

describe("buildExportScene", () => {
  it("exports furniture objects", () => {
    const doc: BuildingDocument = {
      id: "doc",
      version: "0.1.0",
      name: "Export",
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
              walls: [],
              rooms: [],
              openings: [],
              objects: [{ id: "sofa", floorId: "f1", type: "sofa", position: [1, 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
            },
          ],
        },
      ],
      materials: [],
      assets: [],
      metadata: {},
    };

    expect(buildExportScene(doc).getObjectByName("sofa")).toBeDefined();
  });
});
