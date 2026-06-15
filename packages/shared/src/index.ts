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
  code: string;
  message: string;
  entityId?: string;
  path?: string[];
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
