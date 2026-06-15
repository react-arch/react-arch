import Reconciler from "react-reconciler";
import type { ReactElement } from "react";

/** A node in the intermediate instance tree built by the reconciler. */
export interface Instance {
  tag: string;
  props: Record<string, unknown>;
  children: Instance[];
}

export interface Container {
  children: Instance[];
}

function stripChildren(props: Record<string, unknown>): Record<string, unknown> {
  const { children, ...rest } = props;
  void children;
  return rest;
}

// react-reconciler's types are notoriously strict; the host config is plain.
const hostConfig: any = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  noTimeout: -1,
  now: () => 0,

  getRootHostContext: () => ({}),
  getChildHostContext: (parent: unknown) => parent,
  getPublicInstance: (instance: Instance) => instance,

  prepareForCommit: () => null,
  resetAfterCommit: () => {},
  preparePortalMount: () => {},

  createInstance(tag: string, props: Record<string, unknown>): Instance {
    return { tag, props: stripChildren(props), children: [] };
  },

  createTextInstance(text: string): Instance {
    return { tag: "ra-text", props: { text }, children: [] };
  },

  appendInitialChild(parent: Instance, child: Instance) {
    parent.children.push(child);
  },
  appendChild(parent: Instance, child: Instance) {
    parent.children.push(child);
  },
  appendChildToContainer(container: Container, child: Instance) {
    container.children.push(child);
  },

  insertBefore(parent: Instance, child: Instance, before: Instance) {
    const i = parent.children.indexOf(before);
    parent.children.splice(i, 0, child);
  },
  insertInContainerBefore(container: Container, child: Instance, before: Instance) {
    const i = container.children.indexOf(before);
    container.children.splice(i, 0, child);
  },

  removeChild(parent: Instance, child: Instance) {
    parent.children = parent.children.filter((c) => c !== child);
  },
  removeChildFromContainer(container: Container, child: Instance) {
    container.children = container.children.filter((c) => c !== child);
  },

  finalizeInitialChildren: () => false,
  shouldSetTextContent: () => false,
  clearContainer(container: Container) {
    container.children = [];
  },

  prepareUpdate: () => true,
  commitUpdate(instance: Instance, _payload: unknown, _tag: string, _old: unknown, newProps: Record<string, unknown>) {
    instance.props = stripChildren(newProps);
  },
  commitTextUpdate(instance: Instance, _old: string, text: string) {
    instance.props = { text };
  },

  getCurrentEventPriority: () => 16,
  detachDeletedInstance: () => {},
  prepareScopeUpdate: () => {},
  getInstanceFromScope: () => null,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur: () => {},
  afterActiveInstanceBlur: () => {},
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
};

const reconciler = Reconciler(hostConfig);

const LegacyRoot = 0;

/**
 * Render a React element tree through the React Arch reconciler and return the
 * resulting intermediate instance tree. Synchronous (legacy root) so the tree
 * is fully built when this returns.
 */
export function renderToInstances(element: ReactElement): Instance[] {
  const container: Container = { children: [] };
  const root = reconciler.createContainer(
    container,
    LegacyRoot,
    null,
    false,
    null,
    "react-arch",
    (error: unknown) => {
      // Surface render errors loudly; the studio shows them as diagnostics.
      console.error("[react-arch] render error", error);
    },
    null,
  );
  reconciler.updateContainer(element, root, null, null);
  return container.children;
}
