/**
 * @react-arch/geometry
 *
 * Pure geometry operations for the React Arch building model. No rendering,
 * no React, no Three.js — just math behind stable React Arch APIs.
 */
export type { Vec2, Vec3 } from "@react-arch/shared";
export { EPSILON } from "@react-arch/shared";
export * from "./vec2.js";
export * from "./line.js";
export * from "./polygon.js";
export * from "./wall.js";
export * from "./snap.js";
export * from "./roof.js";
