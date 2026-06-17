---
"@react-arch/core": patch
---

Implement the `wall-intersection` check. It was a declared diagnostic code with no check behind it; now `checkQuality` flags walls that cross through each other's interior (an "X" crossing) as an error, while leaving legitimate corners and T-junctions alone. Backed by a new `segmentsProperlyIntersect` geometry helper.
