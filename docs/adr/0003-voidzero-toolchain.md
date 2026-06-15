# ADR 0003 — VoidZero toolchain

## Status
Accepted

## Context
The original brief named ESLint/Prettier/Vite. The team standardized on the
[VoidZero](https://voidzero.dev/) stack instead.

## Decision
- **Lint:** `oxlint` (`.oxlintrc.json`) instead of ESLint.
- **Dev server / bundler:** `rolldown-vite`, scoped to `apps/studio` via a
  package alias (`"vite": "npm:rolldown-vite@latest"`).
- **React transform:** `@vitejs/plugin-react-oxc` (oxc-based).
- **Package builds:** `tsdown` (Rolldown-based).
- **Tests:** Vitest.

## Why scope rolldown-vite to the Studio?
A repo-wide pnpm `override` of `vite` broke Vitest (which expected a
Vite 5/6 transform pipeline and threw `__vite_ssr_exportName__ is not defined`
against rolldown-vite 7). Scoping rolldown-vite to the Studio's own dependency
and giving the rest of the repo a normal Vite for Vitest resolves the conflict
cleanly. Workspace packages are aliased to their TS source so the Studio
transpiles them directly (full cross-repo HMR, no per-package build step).

## Consequences
- Two `vite` resolutions coexist (rolldown-vite in the Studio, Vite for tests).
- `tsconfig.base.json` sets `jsx: react-jsx`; the oxc plugin handles JSX.
