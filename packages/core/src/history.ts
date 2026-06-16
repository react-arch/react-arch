import { createId, deepClone } from "@react-arch/shared";
import type { BuildingDocument } from "./model.js";

export interface HistoryEntry {
  id: string;
  label: string;
  before: BuildingDocument;
  after: BuildingDocument;
}

/**
 * Command-based undo/redo. Keeps full document snapshots per entry which is
 * simple and correct for the MVP; this can later move to patches / op logs
 * without changing the public surface.
 */
export class History {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];

  constructor(private limit = 200) {}

  push(label: string, before: BuildingDocument, after: BuildingDocument): void {
    this.past.push({ id: createId("hist"), label, before: deepClone(before), after: deepClone(after) });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): BuildingDocument | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push(entry);
    return deepClone(entry.before);
  }

  redo(): BuildingDocument | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push(entry);
    return deepClone(entry.after);
  }

  get undoLabel(): string | null {
    return this.past.at(-1)?.label ?? null;
  }

  get redoLabel(): string | null {
    return this.future.at(-1)?.label ?? null;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
