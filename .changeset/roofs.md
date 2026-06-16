---
"@react-arch/core": minor
---

Add roof support. Buildings can now declare `<Roof type="flat" | "gable" | "hip" />` children with optional `pitch`, `overhang`, `thickness`, and `materialId`. Roofs are modelled in geometry (`roofGeometry`), rendered in the 3D view behind a "Roof" toggle in the studio (hidden by default so interiors stay visible), included in the GLTF/GLB export, and validated by the schema. The FamilyHouse example ships with a hip roof.
