/**
 * The stable, machine-readable diagnostic codes React Arch emits. Agents key off
 * these rather than message text. Every diagnostic carries a `fix` hint.
 */
export type DiagnosticCode =
  // structural / schema
  | "schema"
  | "version"
  | "duplicate-id"
  | "bad-floor-ref"
  | "bad-building-ref"
  | "bad-wall-ref"
  | "zero-length-wall"
  | "open-room"
  | "render"
  // quality / code-compliance
  | "opening-overflow"
  | "opening-overlap"
  | "door-too-narrow"
  | "room-too-small"
  | "room-no-egress"
  | "low-daylight"
  | "corridor-too-narrow"
  | "overlapping-rooms"
  | "unknown-material"
  | "wall-intersection"
  | "invalid-stair-rise"
  | "missing-stairs"
  // design brief
  | "brief-missing-room"
  | "brief-room-too-small"
  | "brief-adjacency-missing"
  | "brief-floor-count";
