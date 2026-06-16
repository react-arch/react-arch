import type { Diagnostic } from "@react-arch/shared";
import { allFloors, type BuildingDocument, type Opening, type Room } from "@react-arch/core";
import { bounds, polygonArea, stairGeometry, type Vec2 } from "@react-arch/geometry";

export interface QualityOptions {
  minDoorWidth?: number;
  minCorridorWidth?: number;
  /** Minimum glazing area as a fraction of floor area for habitable rooms. */
  daylightRatio?: number;
  /** Minimum clear landing in front of a door at a stair flight / stairwell void. */
  minStairLanding?: number;
}

const HABITABLE = new Set(["bedroom", "sleeping", "living", "kitchen", "dining", "office"]);
const ROOM_MIN_AREA: Record<string, number> = {
  living: 10,
  kitchen: 5,
  bedroom: 7,
  sleeping: 7,
  dining: 7,
  office: 6,
  bathroom: 3,
  wet: 3,
  corridor: 1,
  hallway: 1,
};

/** Classify a room by usageType then name keywords. */
function category(r: Room): string {
  const hay = `${r.usageType ?? ""} ${r.name ?? ""}`.toLowerCase();
  for (const key of Object.keys(ROOM_MIN_AREA)) {
    if (hay.includes(key)) return key;
  }
  if (hay.includes("bath") || hay.includes("wc") || hay.includes("toilet")) return "bathroom";
  if (hay.includes("bed")) return "bedroom";
  return "other";
}

function rect(poly: Vec2[]) {
  const b = bounds(poly);
  return { minX: b.min[0], minY: b.min[1], maxX: b.max[0], maxY: b.max[1], width: b.width, depth: b.height };
}

function overlapArea(a: ReturnType<typeof rect>, b: ReturnType<typeof rect>): number {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Code-compliance-style quality checks over the model. Returns diagnostics. */
export function checkQuality(doc: BuildingDocument, options: QualityOptions = {}): Diagnostic[] {
  const minDoor = options.minDoorWidth ?? 0.8;
  const minCorridor = options.minCorridorWidth ?? 0.9;
  const daylight = options.daylightRatio ?? 0.08;
  const minLanding = options.minStairLanding ?? 0.6;
  const diags: Diagnostic[] = [];
  const materialIds = new Set(doc.materials.map((m) => m.id));

  // Footprint each stair occupies, mapped to the floor(s) it affects: the
  // flight on its own floor, plus the stairwell void on the floor above.
  const floors = allFloors(doc);
  const stairRects: { floorId: string; min: Vec2; max: Vec2 }[] = [];
  for (const f of floors) {
    for (const st of f.stairs) {
      const fp = stairGeometry({
        position: st.position, width: st.width, run: st.run, rise: st.rise,
        direction: st.direction, steps: st.steps, baseY: 0,
      }).footprint;
      stairRects.push({ floorId: f.id, min: fp.min, max: fp.max });
      const above = floors.find((o) => Math.abs(o.elevation - (f.elevation + f.height)) < 0.3);
      if (above) stairRects.push({ floorId: above.id, min: fp.min, max: fp.max });
    }
  }

  const unknownMaterial = (kind: string, id: string, materialId: string) =>
    diags.push({
      severity: "warning",
      code: "unknown-material",
      entityKind: kind,
      entityId: id,
      message: `${kind} ${id} references unknown material "${materialId}"`,
      fix: `Reference a material id present in \`materials\`, or declare <Material id="${materialId}" …/>.`,
      data: { materialId },
    });

  for (const floor of allFloors(doc)) {
    for (const w of floor.walls) {
      if (w.materialId && !materialIds.has(w.materialId)) unknownMaterial("wall", w.id, w.materialId);
    }
    const wallById = new Map(floor.walls.map((w) => [w.id, w]));

    // Openings: overlap on a wall + narrow doors.
    const byWall = new Map<string, Opening[]>();
    for (const o of floor.openings) {
      const arr = byWall.get(o.wallId);
      if (arr) arr.push(o);
      else byWall.set(o.wallId, [o]);
      if (o.type === "door" && o.width + 1e-6 < minDoor) {
        diags.push({
          severity: "warning",
          code: "door-too-narrow",
          entityKind: "opening",
          entityId: o.id,
          message: `Door ${o.id} is ${o.width} m wide (min ${minDoor} m for clearance)`,
          fix: `Set width to at least ${minDoor} m.`,
          data: { widthM: o.width, minM: minDoor },
        });
      }
    }
    for (const [wallId, list] of byWall) {
      const wall = wallById.get(wallId);
      if (!wall || list.length < 2) continue;
      const spans = list
        .map((o) => ({ id: o.id, a: o.offset - o.width / 2, b: o.offset + o.width / 2 }))
        .sort((x, y) => x.a - y.a);
      for (let i = 1; i < spans.length; i++) {
        if (spans[i]!.a < spans[i - 1]!.b - 1e-6) {
          diags.push({
            severity: "error",
            code: "opening-overlap",
            entityKind: "opening",
            entityId: spans[i]!.id,
            message: `Openings ${spans[i - 1]!.id} and ${spans[i]!.id} overlap on wall ${wallId}`,
            fix: "Space the openings so their offset ± width/2 ranges don't overlap.",
            data: { other: spans[i - 1]!.id, wallId },
          });
        }
      }
    }

    // Landing clearance: a door must not open directly onto a stair flight or
    // stairwell void — you'd step out straight onto the steps or a drop.
    const floorStairRects = stairRects.filter((s) => s.floorId === floor.id);
    if (floorStairRects.length > 0) {
      for (const o of floor.openings) {
        if (o.type !== "door") continue;
        const wall = wallById.get(o.wallId);
        if (!wall) continue;
        const dx = wall.end[0] - wall.start[0];
        const dy = wall.end[1] - wall.start[1];
        const len = Math.hypot(dx, dy) || 1;
        const cx = wall.start[0] + (dx / len) * o.offset;
        const cy = wall.start[1] + (dy / len) * o.offset;
        let nearest = Infinity;
        for (const s of floorStairRects) {
          const ox = Math.max(s.min[0] - cx, 0, cx - s.max[0]);
          const oy = Math.max(s.min[1] - cy, 0, cy - s.max[1]);
          nearest = Math.min(nearest, Math.hypot(ox, oy));
        }
        if (nearest + 1e-6 < minLanding) {
          diags.push({
            severity: "warning",
            code: "door-blocks-stair",
            entityKind: "opening",
            entityId: o.id,
            message: `Door ${o.id} opens ${nearest.toFixed(2)} m from a staircase (needs a ${minLanding} m clear landing)`,
            fix: "Move the door or the stair so there is a clear landing in front of the door, away from the steps and stairwell.",
            data: { clearanceM: round2(nearest), minM: minLanding },
          });
        }
      }
    }

    for (const r of floor.rooms) {
      const cat = category(r);
      const rc = rect(r.polygon);
      const area = polygonArea(r.polygon);
      const boundary = new Set(r.boundaryWallIds ?? []);

      const min = ROOM_MIN_AREA[cat];
      if (min !== undefined && area + 1e-6 < min) {
        diags.push({
          severity: "warning",
          code: "room-too-small",
          entityKind: "room",
          entityId: r.id,
          message: `${r.name} is ${area.toFixed(1)} m² (min ~${min} m² for a ${cat})`,
          fix: `Enlarge to at least ${min} m².`,
          data: { areaM2: round1(area), minM2: min, category: cat },
        });
      }

      if (boundary.size > 0) {
        const hasDoor = floor.openings.some((o) => o.type === "door" && boundary.has(o.wallId));
        if (!hasDoor) {
          diags.push({
            severity: "warning",
            code: "room-no-egress",
            entityKind: "room",
            entityId: r.id,
            message: `${r.name} has no door (no egress)`,
            fix: "Add a <Door> on one of the room's walls.",
          });
        }
        if (HABITABLE.has(cat)) {
          const winArea = floor.openings
            .filter((o) => o.type === "window" && boundary.has(o.wallId))
            .reduce((s, o) => s + o.width * o.height, 0);
          if (area > 0 && winArea / area + 1e-6 < daylight) {
            diags.push({
              severity: "info",
              code: "low-daylight",
              entityKind: "room",
              entityId: r.id,
              message: `${r.name} glazing is ${(100 * winArea / area).toFixed(1)}% of floor area (target ≥ ${(daylight * 100).toFixed(0)}%)`,
              fix: "Add or widen windows on this room.",
              data: { glazingRatio: round2(winArea / area), targetRatio: daylight },
            });
          }
        }
      }

      if ((cat === "corridor" || cat === "hallway") && Math.min(rc.width, rc.depth) + 1e-6 < minCorridor) {
        diags.push({
          severity: "warning",
          code: "corridor-too-narrow",
          entityKind: "room",
          entityId: r.id,
          message: `${r.name} is ${Math.min(rc.width, rc.depth).toFixed(2)} m wide (min ${minCorridor} m)`,
          fix: `Widen the corridor to at least ${minCorridor} m.`,
          data: { widthM: round2(Math.min(rc.width, rc.depth)), minM: minCorridor },
        });
      }
    }

    // Stairs: riser height within a comfortable range.
    for (const st of floor.stairs) {
      const riser = st.rise / Math.max(st.steps, 1);
      if (riser > 0.22 + 1e-6 || riser < 0.1 - 1e-6) {
        diags.push({
          severity: "warning",
          code: "invalid-stair-rise",
          entityKind: "stair",
          entityId: st.id,
          message: `Stair ${st.id} has a ${(riser * 100).toFixed(1)} cm riser (comfortable range 10–22 cm)`,
          fix: "Adjust `steps` or `rise` so each riser is ~17–19 cm.",
          data: { riserM: round2(riser), steps: st.steps, riseM: st.rise },
        });
      }
    }

    // Overlapping rooms (rectangles).
    const rects = floor.rooms.map((r) => ({ room: r, r: rect(r.polygon) }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const ov = overlapArea(rects[i]!.r, rects[j]!.r);
        if (ov > 0.05) {
          diags.push({
            severity: "warning",
            code: "overlapping-rooms",
            entityKind: "room",
            entityId: rects[i]!.room.id,
            message: `${rects[i]!.room.name} overlaps ${rects[j]!.room.name} (${ov.toFixed(1)} m²)`,
            fix: "Reposition the rooms so their footprints don't overlap.",
            data: { other: rects[j]!.room.id, overlapM2: round1(ov) },
          });
        }
      }
    }
  }

  // Multi-storey buildings need vertical circulation.
  for (const building of doc.buildings) {
    const storeys = building.floors.filter((f) => f.walls.length > 0 || f.rooms.length > 0);
    if (storeys.length < 2) continue;
    const hasStairs = building.floors.some((f) => f.stairs.length > 0);
    if (!hasStairs) {
      diags.push({
        severity: "warning",
        code: "missing-stairs",
        entityKind: "floor",
        entityId: storeys[0]!.id,
        message: `${building.name} has ${storeys.length} storeys but no stairs (no vertical circulation)`,
        fix: "Add a <Stairs> on a floor reaching the storey above.",
        data: { buildingId: building.id, storeys: storeys.length },
      });
    }
  }

  return diags;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
