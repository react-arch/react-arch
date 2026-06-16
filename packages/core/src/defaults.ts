import { createId } from "@react-arch/shared";
import type { BuildingDocument, Material } from "./model.js";
import { MODEL_VERSION } from "./model.js";

export const DEFAULT_MATERIALS: Material[] = [
  { id: "mat-plaster", name: "White Plaster", category: "wall", baseColor: "#e8e6e1", roughness: 0.9 },
  { id: "mat-concrete", name: "Concrete", category: "wall", baseColor: "#9b9b97", roughness: 0.8 },
  { id: "mat-oak", name: "Oak Floor", category: "floor", baseColor: "#b88a52", roughness: 0.6 },
  { id: "mat-dark-wood", name: "Dark Wood", category: "wood", baseColor: "#4a3525", roughness: 0.5 },
  { id: "mat-glass", name: "Glass", category: "glass", baseColor: "#bcd6e6", opacity: 0.35, roughness: 0.05, metalness: 0.1 },
  { id: "mat-metal", name: "Metal", category: "metal", baseColor: "#8a8d91", metalness: 0.9, roughness: 0.3 },
  { id: "mat-tile", name: "Ceramic Tile", category: "ceramic", baseColor: "#d8dcdd", roughness: 0.4 },
];

export interface EmptyDocumentOptions {
  name?: string;
  units?: "metric" | "imperial";
  buildingName?: string;
}

export function createEmptyDocument(
  options: EmptyDocumentOptions = {},
): BuildingDocument {
  const buildingId = createId("bld");
  return {
    id: createId("doc"),
    version: MODEL_VERSION,
    name: options.name ?? "Untitled",
    units: options.units ?? "metric",
    buildings: [
      {
        id: buildingId,
        name: options.buildingName ?? options.name ?? "Building",
        floors: [],
      },
    ],
    materials: DEFAULT_MATERIALS.map((m) => ({ ...m })),
    assets: [],
    metadata: {},
  };
}
