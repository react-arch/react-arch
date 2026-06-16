import type { Diagnostic } from "@react-arch/shared";
import { allFloors, type BuildingDocument } from "@react-arch/core";
import { validateDocument } from "./validate.js";
import { checkQuality, type QualityOptions } from "./quality.js";
import { checkBrief, roomSchedule, type AreaSchedule, type DesignBrief } from "./brief.js";

export interface ReviewReport {
  /** True when there are no error-severity diagnostics. */
  ok: boolean;
  counts: { error: number; warning: number; info: number };
  diagnostics: Diagnostic[];
  schedule: AreaSchedule;
  summary: {
    name: string;
    floors: number;
    rooms: number;
    walls: number;
    openings: number;
    objects: number;
  };
}

export interface ReviewOptions {
  brief?: DesignBrief;
  quality?: QualityOptions | false;
}

/**
 * Run the full agent review pass — structural validation, quality/code checks,
 * and (optionally) design-brief conformance — and return one machine-readable
 * report. This is what the `react-arch check` CLI emits.
 */
export function review(doc: BuildingDocument, options: ReviewOptions = {}): ReviewReport {
  const diagnostics: Diagnostic[] = [...validateDocument(doc)];
  if (options.quality !== false) {
    diagnostics.push(...checkQuality(doc, options.quality || {}));
  }
  if (options.brief) {
    diagnostics.push(...checkBrief(doc, options.brief));
  }

  const counts = { error: 0, warning: 0, info: 0 };
  for (const d of diagnostics) counts[d.severity]++;

  const floors = allFloors(doc);
  return {
    ok: counts.error === 0,
    counts,
    diagnostics,
    schedule: roomSchedule(doc),
    summary: {
      name: doc.name,
      floors: floors.length,
      rooms: floors.reduce((s, f) => s + f.rooms.length, 0),
      walls: floors.reduce((s, f) => s + f.walls.length, 0),
      openings: floors.reduce((s, f) => s + f.openings.length, 0),
      objects: floors.reduce((s, f) => s + f.objects.length, 0),
    },
  };
}
