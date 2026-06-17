import type { BuildingDocument } from "@react-arch/core";
import { review, type ReviewOptions } from "./review.js";

export interface VariantMetrics {
  name: string;
  /** No error-severity diagnostics. */
  ok: boolean;
  counts: { error: number; warning: number; info: number };
  totalAreaM2: number;
  floors: number;
  rooms: number;
  walls: number;
  openings: number;
  objects: number;
  /** 0–100 quality score: 100 minus weighted diagnostics. Higher is better. */
  score: number;
}

export interface VariantComparison {
  variants: VariantMetrics[];
  /** Name of the top-ranked variant (highest score; ties → larger area). */
  best: string | null;
}

/** Weighted penalty per diagnostic severity, subtracted from a base of 100. */
const WEIGHT = { error: 25, warning: 6, info: 1 };

function scoreOf(counts: { error: number; warning: number; info: number }): number {
  const penalty = counts.error * WEIGHT.error + counts.warning * WEIGHT.warning + counts.info * WEIGHT.info;
  return Math.max(0, 100 - penalty);
}

/**
 * Compare several design variants — each a rendered BuildingDocument — by
 * running the full review pass on each and scoring it. Returns per-variant
 * metrics plus the best variant, so an agent can pick or iterate. Ranking is
 * by score (fewest weighted diagnostics), breaking ties toward more floor area.
 */
export function compareVariants(
  input: { name: string; doc: BuildingDocument }[],
  options: ReviewOptions = {},
): VariantComparison {
  const variants: VariantMetrics[] = input.map(({ name, doc }) => {
    const report = review(doc, options);
    return {
      name,
      ok: report.ok,
      counts: report.counts,
      totalAreaM2: report.schedule.totalAreaM2,
      floors: report.summary.floors,
      rooms: report.summary.rooms,
      walls: report.summary.walls,
      openings: report.summary.openings,
      objects: report.summary.objects,
      score: scoreOf(report.counts),
    };
  });

  const ranked = [...variants].sort((a, b) => b.score - a.score || b.totalAreaM2 - a.totalAreaM2);
  return { variants, best: ranked[0]?.name ?? null };
}
