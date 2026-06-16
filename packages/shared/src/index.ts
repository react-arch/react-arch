/**
 * @react-arch/shared
 *
 * Framework-agnostic primitives shared across every React Arch package.
 * No dependencies on React, Three.js, PixiJS, or browser APIs.
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type Units = "metric" | "imperial";

/** Numeric tolerance for floating-point geometry comparisons. */
export const EPSILON = 1e-6;

export function approxEqual(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) <= eps;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to a sane precision to avoid floating point noise in the model. */
export function round(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Deterministic-ish id generator. Avoids `Math.random` at module load so the
 * model layer stays predictable and testable; callers may inject their own.
 */
let __counter = 0;
export function createId(prefix = "id"): string {
  __counter += 1;
  const time = Date.now().toString(36);
  const seq = __counter.toString(36);
  return `${prefix}_${time}${seq}`;
}

/** Branded result of a model mutation. */
export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: Severity;
  /** Stable machine-readable code, e.g. "room-too-small". */
  code: string;
  message: string;
  /** Actionable hint for an agent or human to fix the issue. */
  fix?: string;
  entityId?: string;
  /** Kind of the offending entity, e.g. "room" | "wall" | "opening" | "floor". */
  entityKind?: string;
  path?: string[];
  /** Structured payload, e.g. { areaM2: 3.1, minM2: 5 }. */
  data?: Record<string, unknown>;
}

export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Structured-clone based deep copy, with a fallback for older runtimes. */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
