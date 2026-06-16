# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

When you make a change to a publishable package, add a changeset:

```bash
pnpm changeset
```

Pick the affected packages and a bump type (patch / minor / major) and write a
short summary. Commit the generated file in `.changeset/`.

On merge to `main`, the Release workflow opens a "Version Packages" PR that
applies the changesets (bumps versions + updates changelogs). Merging that PR
builds the libraries and publishes them to npm.

Notes:
- All `@react-arch/*` libraries are versioned together (`fixed`).
- `create-react-arch-app` versions independently.
- `@react-arch/studio`, `@react-arch/examples`, and the `react-arch` CLI are
  ignored for now (the CLI needs the Studio bundled before it can be published).
