# React Arch

> Declarative building design for the web.

Build floor plans and architectural models with React and TypeScript. React Arch
is a declarative platform for **creating, editing, rendering, and exporting
semantic building models** — your code is the source of truth, and the Studio is
a live visualizer for it (think Remotion, but for buildings).

```tsx
import { Building, Floor, Room, Door, Window } from "@react-arch/react";

export function House() {
  return (
    <Building name="Modern House" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={1} width={0.9} height={2.1} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
        </Room>
        <Room id="kitchen" name="Kitchen" x={5} y={0} width={4} depth={4} />
      </Floor>
    </Building>
  );
}
```

That component renders simultaneously as an editable **2D plan**, a generated
**3D model**, a **floor stack**, and the raw **JSON model** — all derived from
one canonical semantic model.

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` launches **React Arch Studio** at http://localhost:5173 with a sample
multi-floor house already loaded. Edit any building under
`examples/buildings/src/` and the Studio updates live.

## Using it in your own project

React Arch ships two CLIs (Remotion-style):

```bash
# Scaffold a new project
npm create react-arch-app my-building
cd my-building
npm install

# Launch the Studio for your project's registered buildings
npm run studio          # → react-arch studio
# or directly:
npx react-arch studio [entry] --port 5173 --open
```

`react-arch studio` loads your **registration root** — a file that
default-exports a component rendering `<Composition id name component />`
entries — and renders the selected building. If you don't pass an `entry`, it
looks for `src/Root.tsx`, `src/root.tsx`, `src/index.tsx`, or `src/index.ts`.
Your code stays the source of truth; the Studio just visualises it.

## The core idea

```
Declarative React input
        ↓   (@react-arch/react — a real react-reconciler)
Semantic building model            ← the single source of truth
        ↓   (@react-arch/core)
Geometry engine (@react-arch/geometry)
        ↓
2D renderer  /  3D renderer  /  exporters
```

The Studio's visual representation is **never** the source of truth. You author
buildings in code; the semantic model is derived; every view and export reads
from that model. See [docs/adr](./docs/adr) for the decisions behind this.

## Monorepo layout

| Package | Responsibility |
| --- | --- |
| `@react-arch/shared` | Primitive types (`Vec2`, units, ids, tolerance, diagnostics) |
| `@react-arch/geometry` | Pure geometry: wall polygons, joins, areas, snapping, opening cuts |
| `@react-arch/core` | Canonical model, immutable commands, undo/redo, serialization, migrations |
| `@react-arch/validation` | Zod schemas + semantic checks → structured diagnostics |
| `@react-arch/react` | Declarative components + reconciler that builds the model |
| `@react-arch/renderer-2d` | Canvas 2D plan renderer (single canvas, no DOM-per-object) |
| `@react-arch/renderer-3d` | React Three Fiber renderer (geometry generated from the model) |
| `@react-arch/exporters` | JSON (lossless), SVG (scaled plan), GLTF/GLB |
| `@react-arch/importers` | JSON importer (+ interface for DXF/IFC/SVG later) |
| `react-arch` | CLI — `react-arch studio` launches the Studio for a project |
| `create-react-arch-app` | Scaffolder — `npm create react-arch-app` |
| `apps/studio` | React Arch Studio — the visualizer (driven by the CLI) |
| `examples/buildings` | Sample buildings + reusable modules, registered Remotion-style |

## Studio features

- **View modes:** 2D Plan, 3D, Split, Floor Stack, JSON (Section is on the roadmap).
- **Floor navigation:** All floors, isolated floor, ghost floors, exploded view.
- **Synchronized selection** across the tree, 2D, and 3D.
- **Read-only properties inspector** (length, area, volume, openings, …).
- **Diagnostics panel** — click a problem to select the entity.
- **Export** to JSON, SVG, and GLB.

> React Arch is a **visualizer**: it does not draw walls or write code back. You
> change the building in your editor; the Studio reflects it. This is the
> deliberate, Remotion-style design — see ADR&nbsp;0002.

## Adding a building

1. Create a component under `examples/buildings/src/` using `@react-arch/react`
   components (or your own composed modules).
2. Register it in `examples/buildings/src/Root.tsx`:
   ```tsx
   <Composition id="my-house" name="My House" component={MyHouse} />
   ```
3. It appears in the Studio's composition selector.

## Toolchain (VoidZero)

- **Bundler/dev server:** [rolldown-vite](https://voidzero.dev) (scoped to the Studio)
- **React transform:** `@vitejs/plugin-react-oxc`
- **Linter:** `oxlint`
- **Tests:** `vitest`
- **Package builds:** `tsdown`
- **Monorepo:** pnpm workspaces + Turborepo

## Scripts

```bash
pnpm dev         # run the Studio
pnpm build       # build the Studio (and any package builds)
pnpm test        # run unit + integration tests
pnpm typecheck   # type-check all packages
pnpm lint        # oxlint
```

## Testing

Unit and integration tests cover wall-polygon generation, intersections, room
areas, opening placement, snapping, model commands, undo/redo, serialization,
the React-tree → model reconciler, and a full render-and-validate pass over
every example building.

```bash
pnpm --filter @react-arch/geometry exec vitest run
pnpm --filter @react-arch/core exec vitest run
pnpm --filter @react-arch/react exec vitest run
pnpm --filter @react-arch/examples exec vitest run
```

## Roadmap

Deferred for now (designed to be addable without breaking the model):
constraint solver, editor package, materials/asset UI, Section view, DXF/IFC,
PDF construction sheets, curved walls, advanced roofs, real-time collaboration
(commands are already shaped as operations). See `docs/adr/0004-deferrals.md`.
