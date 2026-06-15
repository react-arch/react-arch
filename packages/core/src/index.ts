/**
 * @react-arch/core
 *
 * The canonical semantic building model and the immutable commands that
 * operate on it. This package is the single source of truth for building data
 * and depends only on @react-arch/shared and @react-arch/geometry — never on
 * React, Three.js, PixiJS, or browser APIs.
 */
export * from "./model.js";
export * from "./commands.js";
export * from "./history.js";
export * from "./serialize.js";
export * from "./defaults.js";
