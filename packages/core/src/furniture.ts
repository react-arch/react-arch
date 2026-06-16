import type { Vec3 } from "@react-arch/shared";

/**
 * Placeholder furniture geometry. Each entry is the base footprint (metres) at
 * scale 1: `w` along plan X, `d` along plan Y, `h` vertical. A building object's
 * `scale` multiplies these. Intentionally simple boxes for the MVP — no
 * photorealistic assets.
 */
export interface FurnitureDims {
  width: number;
  depth: number;
  height: number;
}

const CATALOG: Record<string, FurnitureDims> = {
  bed: { width: 1.0, depth: 1.0, height: 0.5 },
  sofa: { width: 2.0, depth: 0.9, height: 0.75 },
  table: { width: 1.2, depth: 0.8, height: 0.74 },
  desk: { width: 1.2, depth: 0.6, height: 0.74 },
  chair: { width: 0.5, depth: 0.5, height: 0.9 },
  sink: { width: 0.5, depth: 0.42, height: 0.85 },
  toilet: { width: 0.4, depth: 0.6, height: 0.78 },
  shower: { width: 0.9, depth: 0.9, height: 0.12 },
  "kitchen counter": { width: 1.0, depth: 0.6, height: 0.9 },
  wardrobe: { width: 1.2, depth: 0.6, height: 2.0 },
};

const DEFAULT_DIMS: FurnitureDims = { width: 0.6, depth: 0.6, height: 0.6 };

export const FURNITURE_TYPES = Object.keys(CATALOG);

/** Resolve the footprint of a furniture type, applying its scale. */
export function furnitureDims(type: string, scale: Vec3 = [1, 1, 1]): FurnitureDims {
  const base = CATALOG[type] ?? DEFAULT_DIMS;
  return {
    width: base.width * scale[0],
    depth: base.depth * scale[1],
    height: base.height * scale[2],
  };
}

/** A subtle per-category colour for the placeholder geometry. */
export function furnitureColor(type: string): string {
  if (type === "shower" || type === "sink" || type === "toilet") return "#9fb6c2";
  if (type.includes("counter") || type === "table" || type === "desk") return "#9c7b54";
  if (type === "bed" || type === "sofa") return "#7c8aa0";
  return "#8a8f99";
}
