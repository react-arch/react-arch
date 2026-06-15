# @react-arch/core

The canonical semantic building model and the immutable commands that operate on
it. **The single source of truth** for building data.

Depends only on `@react-arch/shared` and `@react-arch/geometry` — never on React,
Three.js, PixiJS, or browser APIs (ADR 0001).

## Model

`BuildingDocument → Building → Floor → { walls, rooms, openings, objects }`,
plus `materials`, `assets`, `units`, `version`, and `metadata`. Walls are stored
by **centerline + thickness**; the visible polygon is derived by
`@react-arch/geometry`. Openings attach to walls semantically (by `offset` along
the centerline), so they follow when a wall moves.

## Commands

Pure functions returning `{ document, changes, warnings }` — they never mutate
the input:

```ts
import { createWall, createOpening, deleteWall } from "@react-arch/core";

const a = createWall(doc, { floorId: "ground", start: [0, 0], end: [5, 0] });
const b = createOpening(a.document, { wallId, type: "door", offset: 2, width: 0.9, height: 2.1 });
// deleteWall cascades: attached openings are removed too.
```

Floor commands: `createFloor`, `duplicateFloor`, `reorderFloor`, `updateFloor`,
`deleteFloor`. Room/opening commands mirror the wall ones.

## History

`History` provides snapshot-based undo/redo (`push`, `undo`, `redo`,
`canUndo`/`canRedo`). Designed to migrate to patches/op-logs later without
changing the surface.

## Serialization

`serialize` / `deserialize` (JSON is the lossless canonical format) with a
forward-only `migrate` registry and `isCompatibleVersion`.
