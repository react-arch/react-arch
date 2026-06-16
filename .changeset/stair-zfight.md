---
"@react-arch/core": patch
---

Fix stair rendering. Stairs were built as a stack of solid boxes rising from the floor, whose coplanar side faces z-fought into a striped moiré in 3D. Stairs are now a single watertight triangle mesh (treads + risers + side silhouettes) with no overlapping faces, rendered cleanly in the 3D view and GLTF export.
