import { useEffect, useMemo, useSyncExternalStore, type ComponentType } from "react";
import {
  getCompositions,
  getCompositionsVersion,
  renderComposition,
  subscribeCompositions,
  type BuildingComposition,
} from "@react-arch/react";
import { createEmptyDocument, type BuildingDocument } from "@react-arch/core";
import { validateDocument, type Diagnostic } from "@react-arch/validation";
import { useStudio } from "./store.js";
import { Toolbar } from "./components/Toolbar.js";
import { Tree } from "./components/Tree.js";
import { Properties } from "./components/Properties.js";
import { Diagnostics } from "./components/Diagnostics.js";
import { CanvasArea } from "./components/CanvasArea.js";

export interface StudioProps {
  /** A registration root (renders `<Composition>` entries). Enables the building switcher. */
  root?: ComponentType;
  /** A single building component. */
  component?: ComponentType<Record<string, unknown>>;
  /** Props passed to `component`. */
  componentProps?: Record<string, unknown>;
  /** A pre-built document (advanced). */
  document?: BuildingDocument;
  className?: string;
}

function componentName(c: ComponentType): string {
  return (c as { displayName?: string }).displayName || c.name || "Building";
}

/**
 * React Arch Studio — the full visualizer (building tree, properties inspector,
 * floor navigation, 2D/3D/split/stack/JSON views, diagnostics, export). The
 * same component powers `pnpm dev` and apps scaffolded by create-react-arch-app.
 */
export function Studio(props: StudioProps) {
  const Root = props.root;
  const usingRoot = !!Root;

  // Registry-backed compositions are only relevant when a root is mounted.
  const registry = useSyncExternalStore(subscribeCompositions, getCompositions, getCompositions);
  const version = useSyncExternalStore(subscribeCompositions, getCompositionsVersion, getCompositionsVersion);

  const compositions = useMemo<BuildingComposition[]>(() => {
    if (usingRoot) return registry;
    if (props.component) {
      return [
        {
          id: "main",
          name: componentName(props.component),
          component: props.component,
          defaultProps: props.componentProps,
        },
      ];
    }
    return [];
  }, [usingRoot, registry, props.component, props.componentProps]);

  const { compositionId, setComposition } = useStudio();
  useEffect(() => {
    if (compositions.length > 0 && (!compositionId || !compositions.some((c) => c.id === compositionId))) {
      setComposition(compositions[0]!.id);
    }
  }, [compositions, compositionId, setComposition]);

  const comp = compositions.find((c) => c.id === compositionId) ?? compositions[0] ?? null;

  const { doc, renderError } = useMemo<{ doc: BuildingDocument; renderError: string | null }>(() => {
    if (!comp) {
      if (props.document) return { doc: props.document, renderError: null };
      return { doc: createEmptyDocument({ name: "No building" }), renderError: null };
    }
    try {
      return { doc: renderComposition(comp), renderError: null };
    } catch (err) {
      return {
        doc: createEmptyDocument({ name: comp.name }),
        renderError: err instanceof Error ? err.message : String(err),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp, version, props.document]);

  const diagnostics = useMemo<Diagnostic[]>(() => {
    const base = validateDocument(doc);
    if (renderError) base.unshift({ severity: "error", code: "render", message: renderError });
    return base;
  }, [doc, renderError]);

  return (
    <div className={`ra-studio dark flex h-full flex-col bg-[#0f1115] ${props.className ?? ""}`}>
      {Root ? (
        <div style={{ display: "none" }}>
          <Root />
        </div>
      ) : null}

      <Toolbar doc={doc} compositions={compositions} />

      <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: "240px 1fr 280px" }}>
        <aside className="border-r border-edge bg-panel min-h-0 overflow-hidden">
          <Tree doc={doc} />
        </aside>
        <main className="min-h-0 relative bg-[#0f1115]">
          <CanvasArea doc={doc} />
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
