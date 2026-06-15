/**
 * @react-arch/renderer-3d
 *
 * React Three Fiber renderer that generates 3D geometry from the semantic
 * model. It never stores Three.js meshes as data — geometry is derived from
 * the model every render via the pure `build3DScene` helper.
 */
export { Building3D, type Building3DProps } from "./Building3D.js";
export { build3DScene, type Scene3D, type Build3DOptions } from "./scene3d.js";
