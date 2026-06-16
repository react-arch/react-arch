import { describe, expect, it } from "vitest";
import { createEmptyDocument } from "./defaults.js";
import { createFloor, createOpening, createRoom, createWall, deleteWall, rectRoomPolygon } from "./commands.js";
import { History } from "./history.js";
import { deserialize, serialize } from "./serialize.js";
import { findWall } from "./model.js";
import { furnitureDims } from "./furniture.js";

function seed() {
  const doc = createEmptyDocument({ name: "Test" });
  const buildingId = doc.buildings[0]!.id;
  const withFloor = createFloor(doc, { buildingId, name: "Ground", elevation: 0 });
  return { doc: withFloor.document, floorId: withFloor.changes[0]!.id };
}

describe("commands", () => {
  it("creates walls immutably", () => {
    const { doc, floorId } = seed();
    const r = createWall(doc, { floorId, start: [0, 0], end: [4, 0] });
    expect(r.document).not.toBe(doc);
    expect(r.document.buildings[0]!.floors[0]!.walls).toHaveLength(1);
    expect(doc.buildings[0]!.floors[0]!.walls).toHaveLength(0); // original untouched
  });

  it("cascades opening deletion when a wall is removed", () => {
    const { doc, floorId } = seed();
    const w = createWall(doc, { floorId, start: [0, 0], end: [4, 0] });
    const wallId = w.changes[0]!.id;
    const o = createOpening(w.document, { wallId, type: "door", offset: 2, width: 0.9, height: 2.1 });
    expect(o.document.buildings[0]!.floors[0]!.openings).toHaveLength(1);
    const d = deleteWall(o.document, wallId);
    expect(d.document.buildings[0]!.floors[0]!.openings).toHaveLength(0);
    expect(findWall(d.document, wallId)).toBeUndefined();
  });

  it("warns when an opening does not fit its wall", () => {
    const { doc, floorId } = seed();
    const w = createWall(doc, { floorId, start: [0, 0], end: [1, 0] });
    const wallId = w.changes[0]!.id;
    const o = createOpening(w.document, { wallId, type: "window", offset: 0.5, width: 2, height: 1 });
    expect(o.warnings.some((x) => x.code === "opening-overflow")).toBe(true);
  });

  it("makes a rectangular room", () => {
    const { doc, floorId } = seed();
    const r = createRoom(doc, { floorId, name: "Living", polygon: rectRoomPolygon(0, 0, 5, 4) });
    expect(r.document.buildings[0]!.floors[0]!.rooms[0]!.polygon).toHaveLength(4);
  });
});

describe("history", () => {
  it("undoes and redoes", () => {
    const { doc, floorId } = seed();
    const h = new History();
    const r = createWall(doc, { floorId, start: [0, 0], end: [4, 0] });
    h.push("create wall", doc, r.document);
    expect(h.canUndo()).toBe(true);
    const undone = h.undo()!;
    expect(undone.buildings[0]!.floors[0]!.walls).toHaveLength(0);
    const redone = h.redo()!;
    expect(redone.buildings[0]!.floors[0]!.walls).toHaveLength(1);
  });
});

describe("furniture", () => {
  it("returns a known footprint and applies scale", () => {
    expect(furnitureDims("bed")).toMatchObject({ width: 1, depth: 1 });
    const scaled = furnitureDims("bed", [1.6, 2, 1]);
    expect(scaled.width).toBeCloseTo(1.6);
    expect(scaled.depth).toBeCloseTo(2);
  });

  it("falls back for unknown types", () => {
    expect(furnitureDims("unknown-thing").width).toBeGreaterThan(0);
  });
});

describe("serialize", () => {
  it("round-trips a document", () => {
    const { doc } = seed();
    const json = serialize(doc);
    const back = deserialize(json);
    expect(back.name).toBe(doc.name);
    expect(back.version).toBe(doc.version);
  });
});
