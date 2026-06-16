import { allFloors, type BuildingDocument } from "@react-arch/core";
import type { FloorDisplay } from "./store.js";

export function download(filename: string, data: BlobPart, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface FloorView {
  floorIds: string[] | "all";
  ghostFloorIds: string[];
  exploded: boolean;
}

/** Translate the active floor + display mode into concrete visibility. */
export function resolveFloorView(
  doc: BuildingDocument,
  activeFloor: string | "all",
  display: FloorDisplay,
): FloorView {
  const ids = allFloors(doc).map((f) => f.id);
  if (activeFloor === "all" || display === "all") {
    return { floorIds: "all", ghostFloorIds: [], exploded: display === "exploded" };
  }
  if (display === "isolated") {
    return { floorIds: [activeFloor], ghostFloorIds: [], exploded: false };
  }
  if (display === "ghost") {
    return { floorIds: [activeFloor], ghostFloorIds: ids.filter((id) => id !== activeFloor), exploded: false };
  }
  // exploded
  return { floorIds: "all", ghostFloorIds: [], exploded: true };
}
