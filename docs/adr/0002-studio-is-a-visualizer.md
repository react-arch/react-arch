# ADR 0002 — The Studio is a visualizer; code is the source of truth

## Status
Accepted

## Context
Two product shapes were possible: (a) a CAD-style editor where you draw walls
visually and the tool writes JSX/JSON back, or (b) a Remotion-style model where
you author buildings in code and a Studio renders them live.

## Decision
React Arch follows **(b)**. You write `<Building>…</Building>` in your editor.
The Studio is a **read-only visualizer**: select, inspect, navigate floors,
switch view modes, and export. It does not draw walls or generate code.

Buildings are discovered via **Remotion-style registration**: a root component
renders `<Composition id name component />` entries into a module-level registry
the Studio reads. Editing a building hot-reloads and re-renders the views.

The bridge from code to model is `@react-arch/react`, a real
[`react-reconciler`](https://www.npmjs.com/package/react-reconciler) host
renderer. Authoring components (`Building`, `Floor`, `Room`, `Wall`, `Door`, …)
emit host nodes; the reconciler builds an instance tree; `convert()` turns it
into a `BuildingDocument`. Because it is real React, arbitrary composition,
hooks, props, and `.map()` loops work — see `ProgrammaticBlock`.

## Consequences
- No unsafe `eval` / arbitrary in-browser code execution.
- Reusable architectural components are just React components.
- The Studio stays small: it derives a model and renders it.
- `@react-arch/core` commands/undo still exist for programmatic/generative use
  and tests, but are intentionally not wired into Studio editing.
