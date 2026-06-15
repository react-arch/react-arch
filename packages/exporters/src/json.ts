import { serialize, type BuildingDocument } from "@react-arch/core";

/** Canonical lossless JSON export. */
export function exportJSON(doc: BuildingDocument): string {
  return serialize(doc);
}
