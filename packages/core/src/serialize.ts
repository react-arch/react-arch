import { MODEL_VERSION, type BuildingDocument } from "./model.js";

/**
 * Migration registry. Each migration upgrades a document one version forward.
 * Add new entries as the schema evolves; `migrate` chains them in order.
 */
type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<string, Migration> = {
  // Example placeholder for the first real migration:
  // "0.0.1": (doc) => ({ ...doc, version: "0.1.0", assets: doc.assets ?? [] }),
};

export function migrate(input: Record<string, unknown>): Record<string, unknown> {
  let doc = { ...input };
  let guard = 0;
  while (doc.version !== MODEL_VERSION && guard < 50) {
    const m = migrations[doc.version as string];
    if (!m) break; // No path forward; validation will report the mismatch.
    doc = m(doc);
    guard += 1;
  }
  return doc;
}

export function serialize(doc: BuildingDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function deserialize(json: string): BuildingDocument {
  const raw = JSON.parse(json) as Record<string, unknown>;
  return migrate(raw) as unknown as BuildingDocument;
}

export function isCompatibleVersion(version: string): boolean {
  // Same major.minor is considered compatible for the MVP.
  const [a, b] = version.split(".");
  const [ca, cb] = MODEL_VERSION.split(".");
  return a === ca && b === cb;
}
