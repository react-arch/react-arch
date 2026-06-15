# @react-arch/react

Declarative React components for describing buildings, plus the reconciler that
turns your component tree into the canonical `@react-arch/core` model.

This is the layer that makes **code the source of truth** (see ADR 0002). It is
a real [`react-reconciler`](https://npmjs.com/package/react-reconciler) host
renderer, so anything React can do — composition, hooks, props, `.map()` — works
when authoring buildings.

## Components

`Building`, `Floor`, `Room`, `Wall`, `Door`, `Window`, `Opening`, `Furniture`
(`Fixture`), `Material`, `Group`, plus reserved `Slab` / `Roof` / `Stairs`.

```tsx
import { Building, Floor, Room, Door, Window } from "@react-arch/react";

export function House() {
  return (
    <Building name="Modern House" units="metric">
      <Floor id="ground" name="Ground Floor" elevation={0} height={2.8}>
        <Room id="living" name="Living Room" x={0} y={0} width={5} depth={4}>
          <Door wall="south" offset={1} width={0.9} />
          <Window wall="west" offset={2} width={2.2} height={1.4} />
        </Room>
      </Floor>
    </Building>
  );
}
```

A rectangular `<Room>` (`x`, `y`, `width`, `depth`) generates its four perimeter
walls; `<Door>`/`<Window>` attach to a named side (`north`/`south`/`east`/`west`)
at an `offset` along that wall. Coordinates are metres, X→right, Y→down.

## Rendering to the model

```ts
import { renderToDocument } from "@react-arch/react";
const doc = renderToDocument(<House />); // → BuildingDocument
```

## Registration (Remotion-style)

```tsx
import { Composition } from "@react-arch/react";

export function Root() {
  return (
    <>
      <Composition id="house" name="Modern House" component={House} />
    </>
  );
}
```

The Studio mounts `Root`, reads the registry (`getCompositions`), and renders
the selected composition to a model with `renderComposition`.
