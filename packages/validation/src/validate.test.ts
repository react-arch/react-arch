import { describe, expect, it } from "vitest";
import { createEmptyDocument, createFloor, createOpening, createWall } from "@react-arch/core";
import { validateDocument } from "./validate.js";

function seed() {
  const doc = createEmptyDocument({ name: "Validation" });
  const buildingId = doc.buildings[0]!.id;
  const withFloor = createFloor(doc, { buildingId, name: "Ground", elevation: 0 });
  return { doc: withFloor.document, floorId: withFloor.changes[0]!.id };
}

describe("validateDocument", () => {
  it("returns schema diagnostics instead of throwing on malformed input", () => {
    expect(() => validateDocument({ version: "0.1.0" })).not.toThrow();
    expect(validateDocument({ version: "0.1.0" }).some((d) => d.code === "schema")).toBe(true);
  });

  it("reports openings that exceed wall height", () => {
    const { doc, floorId } = seed();
    const wall = createWall(doc, { floorId, start: [0, 0], end: [4, 0], height: 2 });
    const wallId = wall.changes[0]!.id;
    const opening = createOpening(wall.document, { wallId, type: "window", offset: 2, width: 1, height: 1.5, sillHeight: 0.8 });

    expect(validateDocument(opening.document).some((d) => d.code === "opening-overflow")).toBe(true);
  });
});
