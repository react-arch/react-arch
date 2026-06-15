# ADR 0001 — The semantic model is the single source of truth

## Status
Accepted

## Context
A building can be viewed as a 2D plan, a 3D model, a floor stack, JSON, and
multiple exports. If any renderer owned the "real" data, the views would drift
and exports would be lossy.

## Decision
`@react-arch/core` defines one canonical `BuildingDocument`. It depends only on
`@react-arch/shared` and `@react-arch/geometry` — never on React, Three.js,
PixiJS, or browser APIs. Every renderer and exporter is a **pure function of the
model**. Renderers never store authoritative state (no `wall.mesh.position.x`).

Mutations go through immutable commands (`createWall`, `moveOpening`, …) that
return a new document plus `changes` and `warnings`, which feeds an undo/redo
history of document snapshots.

## Consequences
- 2D, 3D, JSON, SVG, and GLTF are guaranteed consistent — they read one model.
- The model is serializable and testable in isolation (Node, no DOM).
- Geometry is *derived* (wall polygons, room areas, opening cuts), never stored,
  so it can never go stale.
- Snapshot-based history is simple and correct; it can move to patches/op-logs
  later without changing the command surface.
