/**
 * @react-arch/importers
 *
 * Import external formats into the canonical model. MVP implements React Arch
 * JSON; the ModelImporter interface is designed so DXF/IFC/SVG/image tracing
 * can be added later without changing call sites.
 */
import { deserialize, type BuildingDocument } from "@react-arch/core";
import { validateDocument, type Diagnostic } from "@react-arch/validation";

export interface ImportResult {
  document: BuildingDocument | null;
  diagnostics: Diagnostic[];
}

export interface ModelImporter<TInput> {
  readonly format: string;
  import(input: TInput): Promise<ImportResult>;
}

export const jsonImporter: ModelImporter<string> = {
  format: "react-arch-json",
  async import(input: string): Promise<ImportResult> {
    try {
      const document = deserialize(input);
      const diagnostics = validateDocument(document);
      const fatal = diagnostics.some((d) => d.severity === "error");
      return { document: fatal ? null : document, diagnostics };
    } catch (err) {
      return {
        document: null,
        diagnostics: [
          { severity: "error", code: "parse", message: err instanceof Error ? err.message : "Invalid JSON" },
        ],
      };
    }
  },
};
