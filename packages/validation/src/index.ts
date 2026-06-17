/**
 * @react-arch/validation
 *
 * Machine-readable validation for agent-generated buildings: structural checks,
 * quality / code-compliance checks, design-brief conformance, and a combined
 * review report. Every diagnostic carries a stable `code` and a `fix` hint.
 */
export * from "./schema.js";
export type { DiagnosticCode } from "./codes.js";
export { validateDocument } from "./validate.js";
export { checkQuality, type QualityOptions } from "./quality.js";
export {
  DesignBriefSchema,
  checkBrief,
  roomSchedule,
  type DesignBrief,
  type AreaSchedule,
  type RoomScheduleRow,
} from "./brief.js";
export { review, type ReviewReport, type ReviewOptions } from "./review.js";
export { compareVariants, type VariantComparison, type VariantMetrics } from "./compare.js";
export type { Diagnostic } from "@react-arch/shared";
