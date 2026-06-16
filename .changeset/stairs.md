---
"@react-arch/core": minor
---

Add stairs and roof-per-floor support.

- New `<Stairs>` component and `Stair` model entity (straight flights with `width`, `run`, `rise`, `direction`, `steps`). Stairs are a child of `<Floor>`.
- `stairGeometry` in `@react-arch/geometry` builds stepped boxes; rendered in 3D, drawn in the 2D plan (treads + up-arrow), and included in GLTF/GLB export.
- Stairs are selectable in the studio with a properties panel and a tree row.
- Validation: new `missing-stairs` check flags multi-storey buildings with no vertical circulation, and `invalid-stair-rise` flags uncomfortable riser heights. `StairSchema` added.
- Roofs gain an optional `floorId` so a roof can cap a specific floor (e.g. multi-height wings) instead of the top visible floor.
- The FamilyHouse example now includes a straight staircase in the hall.
