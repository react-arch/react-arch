---
"react-arch": minor
---

Publish the `react-arch` CLI to npm. `npx react-arch check <entry> --json` now works in any project — it renders your building, runs the full validation pass, and prints a machine-readable report (exiting non-zero on errors), which is the agent feedback loop the skills describe. The CLI bundles the published `@react-arch/*` libraries so it's self-contained. `react-arch studio` (the live-bundler visualizer) is not part of the published CLI yet and prints guidance to use the `<Studio>` component or run it from the repo.
