import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BuildingDocument, EntityRef } from "@react-arch/core";
import { bounds, type Vec2 } from "@react-arch/geometry";
import { buildPlanScene, hitTest, type PlanScene } from "./scene.js";

export interface Plan2DProps {
  document: BuildingDocument;
  floorIds: string[] | "all";
  ghostFloorIds?: string[];
  selected?: EntityRef | null;
  onSelect?: (ref: EntityRef | null) => void;
  onHover?: (ref: EntityRef | null) => void;
  showGrid?: boolean;
  showMeasurements?: boolean;
  gridSize?: number;
  className?: string;
}

interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

const COLORS = {
  bg: "#15171c",
  grid: "#23262e",
  gridMajor: "#2c3038",
  room: "rgba(76, 142, 255, 0.07)",
  roomLabel: "#9aa3b2",
  wall: "#c9ccd1",
  wallStroke: "#080a0d",
  opening: "#e8e6e1",
  door: "#5fb3c9",
  window: "#5f9bff",
  select: "#4c8eff",
  ghost: "rgba(120,130,150,0.25)",
  dim: "#6f7787",
};

export function Plan2D(props: Plan2DProps) {
  const { document: doc, floorIds, showGrid = true, showMeasurements = true, gridSize = 0.5 } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [vp, setVp] = useState<Viewport>({ scale: 40, ox: 0, oy: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ x: number; y: number; moved: boolean; ox: number; oy: number } | null>(null);
  const fittedKey = useRef<string>("");

  const scene = useMemo(() => buildPlanScene(doc, floorIds), [doc, floorIds]);
  const ghostScene = useMemo(
    () => (props.ghostFloorIds?.length ? buildPlanScene(doc, props.ghostFloorIds) : null),
    [doc, props.ghostFloorIds],
  );

  const toScreen = useCallback(
    (p: Vec2): Vec2 => [p[0] * vp.scale + vp.ox, p[1] * vp.scale + vp.oy],
    [vp],
  );
  const toWorld = useCallback(
    (sx: number, sy: number): Vec2 => [(sx - vp.ox) / vp.scale, (sy - vp.oy) / vp.scale],
    [vp],
  );

  // Resize observer for crisp HiDPI canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (size.w === 0 || size.h === 0) return;
    const pts: Vec2[] = [];
    for (const w of scene.walls) pts.push(...w.polygon);
    for (const r of scene.rooms) pts.push(...r.polygon);
    if (pts.length === 0) {
      setVp({ scale: 40, ox: size.w / 2, oy: size.h / 2 });
      return;
    }
    const b = bounds(pts);
    const margin = 60;
    const scale = Math.min(
      (size.w - margin * 2) / Math.max(b.width, 0.5),
      (size.h - margin * 2) / Math.max(b.height, 0.5),
    );
    const cx = (b.min[0] + b.max[0]) / 2;
    const cy = (b.min[1] + b.max[1]) / 2;
    setVp({ scale, ox: size.w / 2 - cx * scale, oy: size.h / 2 - cy * scale });
  }, [scene, size]);

  // Auto-fit when the building or visible floors change (and on first layout).
  useEffect(() => {
    const key = `${doc.id}:${Array.isArray(floorIds) ? floorIds.join(",") : "all"}:${size.w}x${size.h}`;
    if (size.w > 0 && fittedKey.current !== key) {
      fittedKey.current = key;
      fit();
    }
  }, [doc.id, floorIds, size, fit]);

  // --- drawing -------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, size, vp, scene, ghostScene, props.selected ?? null, { showGrid, showMeasurements, gridSize, toScreen });
  }, [size, vp, scene, ghostScene, props.selected, showGrid, showMeasurements, gridSize, toScreen]);

  // --- interaction ---------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false, ox: vp.ox, oy: vp.oy };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      if (d.moved) setVp((v) => ({ ...v, ox: d.ox + dx, oy: d.oy + dy }));
    } else if (props.onHover) {
      const world = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      props.onHover(hitTest(scene, world, 6 / vp.scale));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved && props.onSelect) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const world = toWorld(e.clientX - rect.left, e.clientY - rect.top);
      props.onSelect(hitTest(scene, world, 6 / vp.scale));
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0015);
    setVp((v) => {
      const scale = Math.max(4, Math.min(400, v.scale * factor));
      const wx = (sx - v.ox) / v.scale;
      const wy = (sy - v.oy) / v.scale;
      return { scale, ox: sx - wx * scale, oy: sy - wy * scale };
    });
  };

  return (
    <div ref={containerRef} className={props.className} style={{ width: "100%", height: "100%", position: "relative", background: COLORS.bg }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", cursor: dragRef.current?.moved ? "grabbing" : "default", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => props.onHover?.(null)}
        onWheel={onWheel}
        onDoubleClick={fit}
      />
    </div>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  size: { w: number; h: number },
  vp: Viewport,
  scene: PlanScene,
  ghost: PlanScene | null,
  selected: EntityRef | null,
  opts: { showGrid: boolean; showMeasurements: boolean; gridSize: number; toScreen: (p: Vec2) => Vec2 },
) {
  const { toScreen } = opts;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, size.w, size.h);

  if (opts.showGrid) drawGrid(ctx, size, vp, opts.gridSize);

  if (ghost) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (const w of ghost.walls) fillPolygon(ctx, w.polygon, COLORS.ghost, toScreen);
    ctx.restore();
  }

  // Room fills + labels.
  for (const r of scene.rooms) {
    fillPolygon(ctx, r.polygon, COLORS.room, toScreen);
  }
  // Walls.
  for (const w of scene.walls) {
    const isSel = selected?.kind === "wall" && selected.id === w.id;
    fillPolygon(ctx, w.polygon, isSel ? COLORS.select : COLORS.wall, toScreen, COLORS.wallStroke);
  }
  // Openings.
  for (const o of scene.openings) {
    drawOpening(ctx, o, toScreen, selected?.kind === "opening" && selected.id === o.id);
  }
  // Room labels last (on top).
  for (const r of scene.rooms) {
    const c = toScreen(r.centroid);
    const isSel = selected?.kind === "room" && selected.id === r.id;
    if (isSel) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = COLORS.select;
      ctx.lineWidth = 2;
      polyPath(ctx, r.polygon, toScreen);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = COLORS.roomLabel;
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(r.name, c[0], c[1] - 2);
    if (opts.showMeasurements) {
      ctx.fillStyle = COLORS.dim;
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText(`${r.area.toFixed(1)} m²`, c[0], c[1] + 13);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, size: { w: number; h: number }, vp: Viewport, gridSize: number) {
  const step = gridSize * vp.scale;
  if (step < 6) return;
  const startX = vp.ox % step;
  const startY = vp.oy % step;
  ctx.lineWidth = 1;
  for (let x = startX; x < size.w; x += step) {
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size.h);
    ctx.stroke();
  }
  for (let y = startY; y < size.h; y += step) {
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size.w, y);
    ctx.stroke();
  }
}

function polyPath(ctx: CanvasRenderingContext2D, poly: Vec2[], toScreen: (p: Vec2) => Vec2) {
  poly.forEach((p, i) => {
    const s = toScreen(p);
    if (i === 0) ctx.moveTo(s[0], s[1]);
    else ctx.lineTo(s[0], s[1]);
  });
  ctx.closePath();
}

function fillPolygon(ctx: CanvasRenderingContext2D, poly: Vec2[], fill: string, toScreen: (p: Vec2) => Vec2, stroke?: string) {
  ctx.beginPath();
  polyPath(ctx, poly, toScreen);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawOpening(
  ctx: CanvasRenderingContext2D,
  o: PlanScene["openings"][number],
  toScreen: (p: Vec2) => Vec2,
  selected: boolean,
) {
  const a = toScreen(o.p0);
  const b = toScreen(o.p1);
  const color = selected ? COLORS.select : o.type === "door" ? COLORS.door : o.type === "window" ? COLORS.window : COLORS.opening;
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 3 : 2;
  // Clear the wall under the opening for legibility.
  ctx.save();
  ctx.strokeStyle = COLORS.bg;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();

  if (o.type === "door") {
    // Swing arc.
    const cx = a[0];
    const cy = a[1];
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const start = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = selected ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}
