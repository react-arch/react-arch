/**
 * @react-arch/renderer-2d
 *
 * Canvas-based 2D floor-plan renderer. Draws the derived model — it never
 * mutates it. A single <canvas> handles all walls/rooms/openings (no DOM node
 * per object) so large plans stay fast.
 */
export { Plan2D, type Plan2DProps } from "./Plan2D.js";
export { buildPlanScene, hitTest, type PlanScene } from "./scene.js";
