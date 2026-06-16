import { allFloors, furnitureDims, type BuildingDocument } from "@react-arch/core";
import {
  bounds,
  openingSpan,
  polygonArea,
  polygonCentroid,
  wallPolygon,
  type Vec2,
} from "@react-arch/geometry";

export interface SvgExportOptions {
  floorIds?: string[] | "all";
  showLabels?: boolean;
  showDimensions?: boolean;
  padding?: number;
}

/**
 * Export a scale-preserving SVG floor plan. Coordinates are in metres; the
 * viewBox maps 1 unit = 1 metre so the drawing is to scale.
 */
export function exportSVG(doc: BuildingDocument, options: SvgExportOptions = {}): string {
  const floorIds = options.floorIds ?? "all";
  const showLabels = options.showLabels ?? true;
  const showDimensions = options.showDimensions ?? true;
  const pad = options.padding ?? 1;

  const floors = allFloors(doc).filter((f) =>
    floorIds === "all" ? f.visible : floorIds.includes(f.id),
  );

  const pts: Vec2[] = [];
  for (const f of floors) {
    const wallById = new Map(f.walls.map((w) => [w.id, w]));
    for (const w of f.walls) pts.push(...wallPolygon(w));
    for (const r of f.rooms) pts.push(...r.polygon);
    for (const o of f.openings) {
      const wall = wallById.get(o.wallId);
      if (wall) {
        const span = openingSpan(wall, o);
        pts.push(span.start, span.end);
      }
    }
    for (const ob of f.objects) {
      const d = furnitureDims(ob.type, ob.scale);
      pts.push(
        [ob.position[0] - d.width / 2, ob.position[1] - d.depth / 2],
        [ob.position[0] + d.width / 2, ob.position[1] + d.depth / 2],
      );
    }
  }
  const b = bounds(pts.length ? pts : [[0, 0], [1, 1]]);
  const vx = b.min[0] - pad;
  const vy = b.min[1] - pad;
  const vw = b.width + pad * 2;
  const vh = b.height + pad * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw * 100}" height="${vh * 100}">`,
  );
  parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#ffffff"/>`);
  parts.push(`<g stroke-linejoin="round">`);

  for (const f of floors) {
    // Room fills + labels.
    for (const r of f.rooms) {
      const d = r.polygon.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ") + " Z";
      parts.push(`<path d="${d}" fill="#eef2f7" stroke="none"/>`);
      if (showLabels) {
        const c = polygonCentroid(r.polygon);
        parts.push(`<text x="${c[0]}" y="${c[1]}" font-size="0.32" text-anchor="middle" fill="#1c2430" font-family="sans-serif" font-weight="600">${escapeXml(r.name)}</text>`);
        if (showDimensions) {
          parts.push(`<text x="${c[0]}" y="${c[1] + 0.4}" font-size="0.24" text-anchor="middle" fill="#5a6573" font-family="monospace">${polygonArea(r.polygon).toFixed(1)} m²</text>`);
        }
      }
    }
    // Walls.
    for (const w of f.walls) {
      const d = wallPolygon(w).map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ") + " Z";
      parts.push(`<path d="${d}" fill="#2b2f36" stroke="#000" stroke-width="0.01"/>`);
    }
    // Openings.
    const wallById = new Map(f.walls.map((w) => [w.id, w]));
    for (const o of f.openings) {
      const wall = wallById.get(o.wallId);
      if (!wall) continue;
      const span = openingSpan(wall, o);
      const color = o.type === "door" ? "#c2451f" : "#2f6df6";
      parts.push(`<line x1="${span.start[0]}" y1="${span.start[1]}" x2="${span.end[0]}" y2="${span.end[1]}" stroke="#ffffff" stroke-width="0.16"/>`);
      parts.push(`<line x1="${span.start[0]}" y1="${span.start[1]}" x2="${span.end[0]}" y2="${span.end[1]}" stroke="${color}" stroke-width="0.04"/>`);
    }
  }

  parts.push(`</g></svg>`);
  return parts.join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}
