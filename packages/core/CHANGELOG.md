# @react-arch/core

## 0.3.0

### Minor Changes

- edca1ae: Add variant comparison — the "compare" pillar. `compareVariants()` in `@react-arch/validation` runs the full review on several rendered buildings and returns scored, ranked metrics (diagnostics by severity, area, room/floor/wall counts, a 0–100 quality score, and the best variant). A new `react-arch compare [entries…]` CLI command treats every exported building component (across all entry files) as a variant, prints a comparison table, writes `compare.json`, and emits clean JSON to stdout with `--json`. Also fixes a bundle-cache bug so multiple entries render independently in one CLI invocation.

### Patch Changes

- @react-arch/geometry@0.3.0
- @react-arch/shared@0.3.0

## 0.2.1

### Patch Changes

- 637a5ef: Implement the `wall-intersection` check. It was a declared diagnostic code with no check behind it; now `checkQuality` flags walls that cross through each other's interior (an "X" crossing) as an error, while leaving legitimate corners and T-junctions alone. Backed by a new `segmentsProperlyIntersect` geometry helper.
  - @react-arch/geometry@0.2.1
  - @react-arch/shared@0.2.1

## 0.2.0

### Minor Changes

- 17449ca: Add a `door-blocks-stair` quality check: a door must have a clear landing (default 0.6 m, configurable via `minStairLanding`) from a stair flight or the stairwell void above it — otherwise you'd step out straight onto the steps or a drop. Widen the FamilyHouse central hall to 3 m so its stair has a 1 m landing on each side and no door opens onto the stairwell.
- 2ce4b05: Add roof support. Buildings can now declare `<Roof type="flat" | "gable" | "hip" />` children with optional `pitch`, `overhang`, `thickness`, and `materialId`. Roofs are modelled in geometry (`roofGeometry`), rendered in the 3D view behind a "Roof" toggle in the studio (hidden by default so interiors stay visible), included in the GLTF/GLB export, and validated by the schema. The FamilyHouse example ships with a hip roof.
- 131e968: Add stairs and roof-per-floor support.

  - New `<Stairs>` component and `Stair` model entity (straight flights with `width`, `run`, `rise`, `direction`, `steps`). Stairs are a child of `<Floor>`.
  - `stairGeometry` in `@react-arch/geometry` builds stepped boxes; rendered in 3D, drawn in the 2D plan (treads + up-arrow), and included in GLTF/GLB export.
  - Stairs are selectable in the studio with a properties panel and a tree row.
  - Validation: new `missing-stairs` check flags multi-storey buildings with no vertical circulation, and `invalid-stair-rise` flags uncomfortable riser heights. `StairSchema` added.
  - Roofs gain an optional `floorId` so a roof can cap a specific floor (e.g. multi-height wings) instead of the top visible floor.
  - The FamilyHouse example now includes a straight staircase in the hall.

### Patch Changes

- 37a418a: Fix stair rendering. Stairs were built as a stack of solid boxes rising from the floor, whose coplanar side faces z-fought into a striped moiré in 3D. Stairs are now a single watertight triangle mesh (treads + risers + side silhouettes) with no overlapping faces, rendered cleanly in the 3D view and GLTF export.
- e5bdd18: Cut a stairwell void in the floor slab above a staircase. Floor slabs are now built as extruded shapes with a hole punched where a stair on the floor below arrives, so flights pass through to the next storey instead of being capped by a solid slab. Applied in both the 3D view and the GLTF/GLB export.
  - @react-arch/geometry@0.2.0
  - @react-arch/shared@0.2.0

## 0.1.3

### Patch Changes

- 73552ee: Apply the React Arch brand to the renderers (selection highlight accent #2563EB)
  and ship the shared, embeddable `@react-arch/studio` Studio component used by both
  the dev shell and `create-react-arch-app`.
  - @react-arch/geometry@0.1.3
  - @react-arch/shared@0.1.3

## 0.1.2

### Patch Changes

- 4cb938c: Validate the automated Version Packages PR + OIDC publish flow.
  - @react-arch/geometry@0.1.2
  - @react-arch/shared@0.1.2

## 0.1.1

### Patch Changes

- Maintenance release validating the automated OIDC publish pipeline; ships the
  current `main` (wall corner joins, furniture rendering, stacked-floor z-fighting
  fix) to npm.
  - @react-arch/geometry@0.1.1
  - @react-arch/shared@0.1.1
