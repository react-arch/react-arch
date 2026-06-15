import { createElement, useEffect, type ComponentType, type ReactElement } from "react";
import type { BuildingDocument } from "@react-arch/core";
import { renderToInstances } from "./renderer.js";
import { convert } from "./convert.js";

export interface BuildingComposition {
  id: string;
  name: string;
  component: ComponentType<Record<string, unknown>>;
  defaultProps?: Record<string, unknown>;
}

// --- module-level registry (Remotion-style) -------------------------------

const compositions = new Map<string, BuildingComposition>();
const listeners = new Set<() => void>();
let rootComponent: ComponentType | null = null;
// Cached, referentially-stable snapshot for useSyncExternalStore consumers.
let snapshot: BuildingComposition[] = [];
let version = 0;

function emit(): void {
  snapshot = [...compositions.values()];
  version += 1;
  for (const fn of listeners) fn();
}

/** Increments whenever the registry changes (incl. hot-reload re-registration). */
export function getCompositionsVersion(): number {
  return version;
}

export function __registerComposition(c: BuildingComposition): void {
  compositions.set(c.id, c);
  emit();
}
export function __unregisterComposition(id: string): void {
  compositions.delete(id);
  emit();
}

export function getCompositions(): BuildingComposition[] {
  return snapshot;
}
export function subscribeCompositions(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Register the root component (mirrors Remotion's registerRoot). The Studio
 * mounts this so its <Composition> children register themselves.
 */
export function registerRoot(component: ComponentType): void {
  rootComponent = component;
  emit();
}
export function getRoot(): ComponentType | null {
  return rootComponent;
}

/**
 * Declares a building composition. Renders nothing visible; on mount it
 * registers itself into the module registry the Studio reads.
 */
export function Composition(props: BuildingComposition): null {
  const { id, name, component, defaultProps } = props;
  useEffect(() => {
    __registerComposition({ id, name, component, defaultProps });
    return () => __unregisterComposition(id);
  }, [id, name, component, defaultProps]);
  return null;
}

// --- rendering -------------------------------------------------------------

/** Render any React Arch element tree to the canonical model. */
export function renderToDocument(element: ReactElement, fallbackName?: string): BuildingDocument {
  return convert(renderToInstances(element), fallbackName);
}

/** Render a registered composition (component + its default props) to a model. */
export function renderComposition(comp: BuildingComposition): BuildingDocument {
  const element = createElement(comp.component, comp.defaultProps ?? {});
  return renderToDocument(element, comp.name);
}
