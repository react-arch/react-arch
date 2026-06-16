/**
 * @react-arch/exporters
 *
 * Export the canonical model to other formats. JSON is the lossless canonical
 * format; SVG preserves the scaled 2D plan; GLTF/GLB carries the 3D geometry.
 */
import type { BuildingDocument } from "@react-arch/core";

export { exportJSON } from "./json.js";
export { exportSVG, type SvgExportOptions } from "./svg.js";
export type { GltfExportOptions } from "./gltf.js";

export async function exportGLTF(
  doc: BuildingDocument,
  options: import("./gltf.js").GltfExportOptions = {},
): Promise<ArrayBuffer | object> {
  const { exportGLTF: exportWithThree } = await import("./gltf.js");
  return exportWithThree(doc, options);
}
