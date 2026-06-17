---
"create-react-arch-app": patch
---

Point the scaffolded `check` script at the published `@react-arch/cli` package (the unscoped `react-arch` name is unavailable on npm). The binary is still `react-arch`, so `npm run check` is unchanged; this fixes `npm install` in projects scaffolded by `0.3.1`, which referenced an unpublished dependency.
