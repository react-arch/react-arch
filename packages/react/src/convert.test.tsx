import { describe, expect, it } from "vitest";
import { Building, Door, Floor, Room, Window } from "./components.js";
import { renderToDocument } from "./registry.js";

function House() {
  return (
    <Building name="Test House" units="metric">
      <Floor id="ground" name="Ground" elevation={0} height={2.8}>
        <Room id="living" name="Living" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={1} width={0.9} />
          <Window wall="west" offset={2} width={2.2} />
        </Room>
        <Room id="kitchen" name="Kitchen" x={5} y={0} width={4} depth={4} />
      </Floor>
      <Floor id="first" name="First" elevation={2.8} height={2.7}>
        <Room id="bed" name="Bedroom" x={0} y={0} width={5} depth={4} />
      </Floor>
    </Building>
  );
}

describe("react tree → model", () => {
  const doc = renderToDocument(<House />);

  it("creates one building with two floors ordered by elevation", () => {
    expect(doc.buildings).toHaveLength(1);
    expect(doc.name).toBe("Test House");
    const floors = doc.buildings[0]!.floors;
    expect(floors.map((f) => f.id)).toEqual(["ground", "first"]);
  });

  it("generates perimeter walls per room, merging the shared edge", () => {
    const ground = doc.buildings[0]!.floors[0]!;
    // Living (0–5) and Kitchen (5–9) share the x=5 wall → 2×4 − 1 = 7.
    expect(ground.walls).toHaveLength(7);
    expect(ground.rooms).toHaveLength(2);
  });

  it("attaches openings to the correct room-side walls", () => {
    const ground = doc.buildings[0]!.floors[0]!;
    expect(ground.openings).toHaveLength(2);
    const door = ground.openings.find((o) => o.type === "door")!;
    const southWall = ground.walls.find((w) => w.id === door.wallId)!;
    // South wall of the living room runs along y = depth (4).
    expect(southWall.start[1]).toBeCloseTo(4);
    expect(southWall.end[1]).toBeCloseTo(4);
  });

  it("uses opening default sizes", () => {
    const ground = doc.buildings[0]!.floors[0]!;
    const win = ground.openings.find((o) => o.type === "window")!;
    expect(win.sillHeight).toBeCloseTo(0.9);
  });
});

describe("interior doors between adjacent rooms", () => {
  function TwoRooms() {
    return (
      <Building name="Two Rooms">
        <Floor id="g" name="G" elevation={0} height={2.8}>
          <Room id="a" name="A" x={0} y={0} width={5} depth={4} />
          <Room id="b" name="B" x={5} y={0} width={4} depth={4}>
            <Door wall="west" offset={2} width={0.9} />
          </Room>
        </Floor>
      </Building>
    );
  }
  const doc = renderToDocument(<TwoRooms />);
  const g = doc.buildings[0]!.floors[0]!;

  it("merges the coincident shared wall into one", () => {
    const onSharedLine = g.walls.filter(
      (w) => Math.abs(w.start[0] - 5) < 1e-6 && Math.abs(w.end[0] - 5) < 1e-6,
    );
    expect(onSharedLine).toHaveLength(1);
    // 4 + 4 room walls minus 1 merged duplicate = 7
    expect(g.walls).toHaveLength(7);
  });

  it("cuts the door into the single shared wall so it passes through", () => {
    const door = g.openings.find((o) => o.type === "door")!;
    const wall = g.walls.find((w) => w.id === door.wallId)!;
    expect(Math.abs(wall.start[0] - 5)).toBeLessThan(1e-6);
    // Both rooms reference the surviving wall as a boundary.
    expect(g.rooms[0]!.boundaryWallIds).toContain(door.wallId);
    expect(g.rooms[1]!.boundaryWallIds).toContain(door.wallId);
  });
});
