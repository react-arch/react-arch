---
"@react-arch/core": minor
---

Add variant comparison — the "compare" pillar. `compareVariants()` in `@react-arch/validation` runs the full review on several rendered buildings and returns scored, ranked metrics (diagnostics by severity, area, room/floor/wall counts, a 0–100 quality score, and the best variant). A new `react-arch compare [entries…]` CLI command treats every exported building component (across all entry files) as a variant, prints a comparison table, writes `compare.json`, and emits clean JSON to stdout with `--json`. Also fixes a bundle-cache bug so multiple entries render independently in one CLI invocation.
