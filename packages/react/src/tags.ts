/**
 * Internal host element tags. Users never type these — the public components
 * in `components.tsx` create them. The reconciler builds an instance tree of
 * these tags, which `convert.ts` turns into a BuildingDocument.
 */
export const TAG = {
  building: "ra-building",
  floor: "ra-floor",
  room: "ra-room",
  wall: "ra-wall",
  door: "ra-door",
  window: "ra-window",
  opening: "ra-opening",
  furniture: "ra-furniture",
  material: "ra-material",
  group: "ra-group",
  slab: "ra-slab",
  roof: "ra-roof",
  stairs: "ra-stairs",
  text: "ra-text",
} as const;

export type Tag = (typeof TAG)[keyof typeof TAG];

/** Side of a rectangular room a door/window attaches to. */
export type RoomSide = "north" | "south" | "east" | "west";
