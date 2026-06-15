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
export function validateDocument(doc: BuildingDocument): Diagnostic[] {
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
  }

  if (!isCompatibleVersion(doc.version)) {
    diags.push({
      severity: "warning",
      code: "version",
      message: `Document version ${doc.version} may be incompatible with this build`,
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

  const floors = allFloors(doc);
  const floorIds = new Set(floors.map((f) => f.id));
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
      if (room.polygon.length < 3) {
        diags.push({ severity: "error", code: "open-room", message: `Room ${room.id} boundary is not closed`, entityId: room.id });
      }
    }
    for (const o of floor.openings) {
      checkId(o.id, "opening");
      if (!wallIds.has(o.wallId)) {
        diags.push({ severity: "error", code: "bad-wall-ref", message: `Opening ${o.id} references unknown wall ${o.wallId}`, entityId: o.id });
        continue;
      }
      const wall = floor.walls.find((w) => w.id === o.wallId)!;
      if (!openingFits(wall, o)) {
        diags.push({ severity: "warning", code: "opening-overflow", message: `Opening ${o.id} does not fit within its wall`, entityId: o.id });
      }
    }
    for (const obj of floor.objects) checkId(obj.id, "object");
  }

  // Building → floor references.
  for (const building of doc.buildings) {
    for (const f of building.floors) {
      if (f.buildingId !== building.id) {
        diags.push({ severity: "error", code: "bad-building-ref", message: `Floor ${f.id} references wrong building`, entityId: f.id });
      }
    }
  }
  void floorIds;

  return diags;
}
