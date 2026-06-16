import { z } from "zod";
import type { Diagnostic } from "@react-arch/shared";
import { allFloors, type BuildingDocument, type Room } from "@react-arch/core";
import { polygonArea } from "@react-arch/geometry";

/**
 * A structured design brief an agent can target. React Arch checks a generated
 * model against it (required rooms, areas, adjacencies, floor count).
 */
export const DesignBriefSchema = z.object({
  name: z.string().optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  floors: z.number().int().positive().optional(),
  style: z.string().optional(),
  budget: z.number().optional(),
  orientation: z.string().optional(),
  site: z
    .object({ widthM: z.number().optional(), depthM: z.number().optional() })
    .partial()
    .optional(),
  /** Required rooms (by type/usage keyword) with optional count + min area. */
  rooms: z
    .array(
      z.object({
        type: z.string(),
        name: z.string().optional(),
        count: z.number().int().positive().optional(),
        minAreaM2: z.number().positive().optional(),
      }),
    )
    .default([]),
  /** Pairs of room types that should be adjacent (share a wall). */
  adjacencies: z.array(z.object({ a: z.string(), b: z.string() })).optional(),
  constraints: z.array(z.string()).optional(),
});

export type DesignBrief = z.infer<typeof DesignBriefSchema>;

export interface RoomScheduleRow {
  floorId: string;
  floor: string;
  roomId: string;
  room: string;
  usage?: string;
  areaM2: number;
}
export interface AreaSchedule {
  rooms: RoomScheduleRow[];
  totalAreaM2: number;
  roomCount: number;
  floorCount: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Per-room area schedule with totals — useful for reports and diffs. */
export function roomSchedule(doc: BuildingDocument): AreaSchedule {
  const rows: RoomScheduleRow[] = [];
  const floors = allFloors(doc);
  for (const f of floors) {
    for (const r of f.rooms) {
      rows.push({
        floorId: f.id,
        floor: f.name,
        roomId: r.id,
        room: r.name,
        usage: r.usageType,
        areaM2: round1(polygonArea(r.polygon)),
      });
    }
  }
  return {
    rooms: rows,
    totalAreaM2: round1(rows.reduce((s, r) => s + r.areaM2, 0)),
    roomCount: rows.length,
    floorCount: floors.length,
  };
}

function matches(room: Room, type: string): boolean {
  const hay = `${room.usageType ?? ""} ${room.name ?? ""}`.toLowerCase();
  return hay.includes(type.toLowerCase());
}

function adjacent(a: Room, b: Room): boolean {
  const wa = new Set(a.boundaryWallIds ?? []);
  return (b.boundaryWallIds ?? []).some((id) => wa.has(id));
}

/** Check a model against a design brief. Returns diagnostics. */
export function checkBrief(doc: BuildingDocument, brief: DesignBrief): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const rooms = allFloors(doc).flatMap((f) => f.rooms);

  if (brief.floors !== undefined) {
    const got = allFloors(doc).length;
    if (got !== brief.floors) {
      diags.push({
        severity: "warning",
        code: "brief-floor-count",
        message: `Brief asks for ${brief.floors} floor(s); model has ${got}`,
        fix: `Add or remove <Floor> elements to reach ${brief.floors}.`,
        data: { required: brief.floors, found: got },
      });
    }
  }

  for (const req of brief.rooms) {
    const matched = rooms.filter((r) => matches(r, req.type));
    const need = req.count ?? 1;
    if (matched.length < need) {
      diags.push({
        severity: "error",
        code: "brief-missing-room",
        message: `Brief needs ${need} ${req.type}(s); found ${matched.length}`,
        fix: `Add ${need - matched.length} more ${req.type} room(s).`,
        data: { type: req.type, required: need, found: matched.length },
      });
    }
    if (req.minAreaM2 !== undefined) {
      for (const r of matched) {
        const area = polygonArea(r.polygon);
        if (area + 1e-6 < req.minAreaM2) {
          diags.push({
            severity: "warning",
            code: "brief-room-too-small",
            entityKind: "room",
            entityId: r.id,
            message: `${r.name} is ${area.toFixed(1)} m²; brief requires ≥ ${req.minAreaM2} m² for ${req.type}`,
            fix: `Enlarge ${r.name} to at least ${req.minAreaM2} m².`,
            data: { areaM2: round1(area), minM2: req.minAreaM2, type: req.type },
          });
        }
      }
    }
  }

  for (const adj of brief.adjacencies ?? []) {
    const as = rooms.filter((r) => matches(r, adj.a));
    const bs = rooms.filter((r) => matches(r, adj.b));
    const ok = as.some((ra) => bs.some((rb) => ra.id !== rb.id && adjacent(ra, rb)));
    if (!ok) {
      diags.push({
        severity: "warning",
        code: "brief-adjacency-missing",
        message: `Brief wants ${adj.a} adjacent to ${adj.b}, but they don't share a wall`,
        fix: `Place a ${adj.a} and a ${adj.b} so they share a wall.`,
        data: { a: adj.a, b: adj.b },
      });
    }
  }

  return diags;
}
