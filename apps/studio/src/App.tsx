import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getCompositions,
  getCompositionsVersion,
  renderComposition,
  subscribeCompositions,
} from "@react-arch/react";
import { Root } from "@react-arch/examples";
import { createEmptyDocument, type BuildingDocument } from "@react-arch/core";
import { validateDocument, type Diagnostic } from "@react-arch/validation";
import { useStudio } from "./store.js";
import { Toolbar } from "./components/Toolbar.js";
import { Tree } from "./components/Tree.js";
import { Properties } from "./components/Properties.js";
import { Diagnostics } from "./components/Diagnostics.js";
import { CanvasArea } from "./components/CanvasArea.js";

export function App() {
  const compositions = useSyncExternalStore(subscribeCompositions, getCompositions, getCompositions);
  const version = useSyncExternalStore(subscribeCompositions, getCompositionsVersion, getCompositionsVersion);
  const { compositionId, setComposition } = useStudio();

  // Default to the first registered building once they appear.
  useEffect(() => {
    if (!compositionId && compositions.length > 0) {
      setComposition(compositions[0]!.id);
    }
  }, [compositions, compositionId, setComposition]);

  const comp = compositions.find((c) => c.id === compositionId) ?? compositions[0] ?? null;

  // Derive the canonical model from the building component (Remotion-style).
  // Recompute when the composition changes or on hot-reload (version bump),
  // NOT on every hover/selection — keeps large buildings responsive.
  const { doc, renderError } = useMemo<{ doc: BuildingDocument; renderError: string | null }>(() => {
    if (!comp) return { doc: createEmptyDocument({ name: "No building" }), renderError: null };
    try {
      return { doc: renderComposition(comp), renderError: null };
    } catch (err) {
      return {
        doc: createEmptyDocument({ name: comp.name }),
        renderError: err instanceof Error ? err.message : String(err),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp, version]);

  const diagnostics = useMemo<Diagnostic[]>(() => {
    const base = validateDocument(doc);
    if (renderError) base.unshift({ severity: "error", code: "render", message: renderError });
    return base;
  }, [doc, renderError]);

  return (
    <div className="h-full flex flex-col bg-[#0f1115]">
      {/* Hidden registration root — mounting it registers the buildings. */}
      <div style={{ display: "none" }}>
        <Root />
      </div>

      <Toolbar doc={doc} compositions={compositions} />

      <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: "240px 1fr 280px" }}>
        <aside className="border-r border-edge bg-panel min-h-0 overflow-hidden">
          <Tree doc={doc} />
        </aside>
        <main className="min-h-0 relative bg-[#0f1115]">
          {comp ? <CanvasArea doc={doc} /> : <Loading />}
        </main>
        <aside className="border-l border-edge bg-panel min-h-0 overflow-hidden">
          <Properties doc={doc} />
        </aside>
      </div>

      <div className="h-36 border-t border-edge bg-panel">
        <Diagnostics diagnostics={diagnostics} />
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
      Loading buildings…
    </div>
  );
}
