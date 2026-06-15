# ADR 0004 — MVP scope and deferrals

## Status
Accepted

## Decision
The first release delivers a runnable, end-to-end vertical slice: monorepo,
canonical model, React component API, geometry engine, 2D + 3D renderers,
JSON/SVG/GLTF export, a Studio visualizer with synchronized selection and floor
navigation, sample buildings, and tests.

### Geometry: openings without CSG
3D openings are produced by **decomposing each wall into the solid boxes that
remain around its openings** (`wallBoxes`), plus door/window panels — not by
boolean CSG. This is fast, robust, and good enough for doors and windows in
straight walls. The same decomposition powers the GLTF exporter.

## Deferred (designed to be addable later)
- `@react-arch/constraints` solver, `@react-arch/editor` interaction package,
  `@react-arch/ui` / `@react-arch/icons`.
- Section view (placeholder), DXF/IFC/OBJ/PDF, image tracing import.
- Curved walls, advanced roofs, terrain, MEP, structural analysis.
- Real-time collaboration — commands are already shaped so they can be
  represented as `ModelOperation`s for a future CRDT/Yjs layer.
- Materials/asset authoring UI and instanced furniture geometry.

These omissions are scope decisions, not architectural blockers: each plugs into
the existing model → geometry → renderer pipeline.
