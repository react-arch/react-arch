/**
 * @react-arch/react
 *
 * Declarative React components that describe a building, plus the reconciler
 * that turns the component tree into the canonical @react-arch/core model.
 *
 * Code is the source of truth: you author a building in JSX, and the Studio
 * (or any renderer) derives the semantic model from it — Remotion-style.
 */
export * from "./components.js";
export * from "./registry.js";
export { renderToInstances, type Instance } from "./renderer.js";
export { convert } from "./convert.js";
export { TAG, type RoomSide } from "./tags.js";

// Re-export the model types so consumers only need one import for authoring.
export type {
  BuildingDocument,
  Building as BuildingModel,
  Floor as FloorModel,
  Room as RoomModel,
  Wall as WallModel,
  Opening as OpeningModel,
} from "@react-arch/core";
