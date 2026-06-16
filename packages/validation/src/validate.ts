import type { Diagnostic } from "@react-arch/shared";
import { allFloors, type BuildingDocument } from "@react-arch/core";
import { openingFits, wallLength } from "@react-arch/geometry";
import { isCompatibleVersion } from "@react-arch/core";
import { BuildingDocumentSchema } from "./schema.js";

/**
 * Validate a document and return structured diagnostics. Runs the Zod schema
 * for shape, then semantic checks (unique ids, references, fit). The studio
 * shows these in the diagnostics panel; clicking one selects the entity.
 */
export function validateDocument(doc: unknown): Diagnostic[] {
  const diags: Diagnostic[] = [];

  const parsed = BuildingDocumentSchema.safeParse(doc);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      diags.push({
        severity: "error",
        code: "schema",
        message: issue.message,
        path: issue.path.map(String),
      });
    }
    return diags;
  }

  const checked = parsed.data as BuildingDocument;

  if (!isCompatibleVersion(checked.version)) {
    diags.push({
      severity: "warning",
      code: "version",
      message: `Document version ${checked.version} may be incompatible with this build`,
    });
  }

  // Unique ids across the whole document.
  const seen = new Map<string, string>();
  const checkId = (id: string, kind: string) => {
    if (seen.has(id)) {
      diags.push({
        severity: "error",
        code: "duplicate-id",
        message: `Duplicate id "${id}" (${seen.get(id)} and ${kind})`,
        entityId: id,
      });
    } else {
      seen.set(id, kind);
    }
  };

  checkId(checked.id, "document");
  for (const building of checked.buildings) checkId(building.id, "building");
  for (const material of checked.materials) checkId(material.id, "material");
  for (const asset of checked.assets) {
    if (typeof asset === "object" && asset && "id" in asset && typeof asset.id === "string") {
      checkId(asset.id, "asset");
    }
  }

  const floors = allFloors(checked);
  for (const floor of floors) {
    checkId(floor.id, "floor");
    const wallIds = new Set(floor.walls.map((w) => w.id));
    for (const wall of floor.walls) {
      checkId(wall.id, "wall");
      if (wall.floorId !== floor.id) {
        diags.push({ severity: "error", code: "bad-floor-ref", message: `Wall ${wall.id} references wrong floor`, entityId: wall.id });
      }
      if (wallLength(wall) < 1e-3) {
        diags.push({ severity: "warning", code: "zero-length-wall", message: `Wall ${wall.id} has near-zero length`, entityId: wall.id });
      }
    }
    for (const room of floor.rooms) {
      checkId(room.id, "room");
      if (room.floorId !== floor.id) {
        diags.push({ severity: "error", code: "bad-floor-ref", message: `Room ${room.id} references wrong floor`, entityId: room.id });
      }
      if (room.polygon.length < 3) {
        diags.push({ severity: "error", code: "open-room", message: `Room ${room.id} boundary is not closed`, entityId: room.id });
      }
      for (const wallId of room.boundaryWallIds ?? []) {
        if (!wallIds.has(wallId)) {
          diags.push({ severity: "error", code: "bad-wall-ref", message: `Room ${room.id} references unknown boundary wall ${wallId}`, entityId: room.id });
        }
      }
    }
    for (const o of floor.openings) {
      checkId(o.id, "opening");
      if (o.floorId !== floor.id) {
        diags.push({ severity: "error", code: "bad-floor-ref", message: `Opening ${o.id} references wrong floor`, entityId: o.id });
      }
      if (!wallIds.has(o.wallId)) {
        diags.push({ severity: "error", code: "bad-wall-ref", message: `Opening ${o.id} references unknown wall ${o.wallId}`, entityId: o.id });
        continue;
      }
      const wall = floor.walls.find((w) => w.id === o.wallId)!;
      if (!openingFits(wall, o)) {
        diags.push({ severity: "warning", code: "opening-overflow", message: `Opening ${o.id} does not fit within its wall`, entityId: o.id });
      }
    }
    for (const obj of floor.objects) {
      checkId(obj.id, "object");
      if (obj.floorId !== floor.id) {
        diags.push({ severity: "error", code: "bad-floor-ref", message: `Object ${obj.id} references wrong floor`, entityId: obj.id });
      }
    }
  }

  // Building → floor references.
  for (const building of checked.buildings) {
    for (const f of building.floors) {
      if (f.buildingId !== building.id) {
        diags.push({ severity: "error", code: "bad-building-ref", message: `Floor ${f.id} references wrong building`, entityId: f.id });
      }
    }
  }

  return diags;
}
