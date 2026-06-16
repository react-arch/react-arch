import { describe, expect, it } from "vitest";
import { MODEL_VERSION, type BuildingDocument } from "@react-arch/core";
import { checkQuality } from "./quality.js";
import { checkBrief, roomSchedule, DesignBriefSchema } from "./brief.js";
import { review } from "./review.js";

function makeDoc(): BuildingDocument {
  return {
    id: "doc",
    version: MODEL_VERSION,
    name: "Test",
    units: "metric",
    buildings: [
      {
        id: "b",
        name: "B",
        floors: [
          {
            id: "f",
            buildingId: "b",
            name: "Ground",
            elevation: 0,
            height: 2.8,
            visible: true,
            locked: false,
            walls: [
              { id: "w-s", floorId: "f", start: [0, 3], end: [2, 3], thickness: 0.2, height: 2.8, materialId: "ghost" },
              { id: "w-n", floorId: "f", start: [0, 0], end: [2, 0], thickness: 0.2, height: 2.8 },
            ],
            // 2 × 3 = 6 m² bedroom → below the 7 m² minimum.
            rooms: [
              {
                id: "bed",
                floorId: "f",
                name: "Bedroom",
                polygon: [[0, 0], [2, 0], [2, 3], [0, 3]],
                boundaryWallIds: ["w-s", "w-n"],
                usageType: "sleeping",
              },
            ],
            openings: [],
            objects: [],
            stairs: [],
          },
        ],
      },
    ],
    materials: [],
    assets: [],
    metadata: {},
  };
}

const codes = (ds: { code: string }[]) => new Set(ds.map((d) => d.code));

describe("checkQuality", () => {
  it("flags small rooms, missing egress, no daylight and unknown materials with fix hints", () => {
    const ds = checkQuality(makeDoc());
    const c = codes(ds);
    expect(c).toContain("room-too-small");
    expect(c).toContain("room-no-egress");
    expect(c).toContain("low-daylight");
    expect(c).toContain("unknown-material");
    for (const d of ds) expect(typeof d.fix).toBe("string");
  });

  it("includes structured data on room-too-small", () => {
    const d = checkQuality(makeDoc()).find((x) => x.code === "room-too-small")!;
    expect(d.data).toMatchObject({ minM2: 7 });
    expect(d.entityId).toBe("bed");
  });

  it("flags a multi-storey building with no stairs", () => {
    const doc = makeDoc();
    const ground = doc.buildings[0]!.floors[0]!;
    // Add a second storey so the building has two storeys but no stairs.
    doc.buildings[0]!.floors.push({ ...ground, id: "f2", elevation: 2.8 });
    expect(codes(checkQuality(doc))).toContain("missing-stairs");
  });

  it("clears missing-stairs once a stair connects the floors", () => {
    const doc = makeDoc();
    const ground = doc.buildings[0]!.floors[0]!;
    doc.buildings[0]!.floors.push({ ...ground, id: "f2", elevation: 2.8, stairs: [] });
    ground.stairs.push({
      id: "s1", floorId: "f", kind: "straight", position: [0, 0],
      width: 1, run: 3.5, rise: 2.8, direction: 0, steps: 16,
    });
    const c = codes(checkQuality(doc));
    expect(c.has("missing-stairs")).toBe(false);
  });
});

describe("checkBrief", () => {
  it("reports missing required rooms", () => {
    const brief = DesignBriefSchema.parse({ rooms: [{ type: "kitchen", count: 1 }], floors: 2 });
    const ds = checkBrief(makeDoc(), brief);
    const c = codes(ds);
    expect(c).toContain("brief-missing-room");
    expect(c).toContain("brief-floor-count");
  });
});

describe("review + schedule", () => {
  it("produces a combined report with counts and an area schedule", () => {
    const r = review(makeDoc());
    expect(r.summary.rooms).toBe(1);
    expect(r.schedule.totalAreaM2).toBeCloseTo(6);
    expect(r.counts.warning + r.counts.error + r.counts.info).toBe(r.diagnostics.length);
  });
});
