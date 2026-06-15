import { create } from "zustand";
import type { EntityRef } from "@react-arch/core";

export type ViewMode = "2d" | "3d" | "split" | "stack" | "json";
export type FloorDisplay = "all" | "isolated" | "ghost" | "exploded";

interface StudioState {
  // Which registered building is shown.
  compositionId: string | null;
  setComposition: (id: string) => void;

  // Active view.
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  // Floor navigation.
  activeFloor: string | "all";
  setActiveFloor: (f: string | "all") => void;
  floorDisplay: FloorDisplay;
  setFloorDisplay: (d: FloorDisplay) => void;

  // Shared selection / hover across all views.
  selection: EntityRef | null;
  setSelection: (s: EntityRef | null) => void;
  hovered: EntityRef | null;
  setHovered: (s: EntityRef | null) => void;

  // Preferences / display toggles.
  showGrid: boolean;
  showMeasurements: boolean;
  wireframe: boolean;
  xray: boolean;
  toggle: (key: "showGrid" | "showMeasurements" | "wireframe" | "xray") => void;
}

export const useStudio = create<StudioState>((set) => ({
  compositionId: null,
  setComposition: (id) => set({ compositionId: id, selection: null, activeFloor: "all" }),

  viewMode: "split",
  setViewMode: (m) => set({ viewMode: m }),

  activeFloor: "all",
  setActiveFloor: (f) => set({ activeFloor: f }),
  floorDisplay: "all",
  setFloorDisplay: (d) => set({ floorDisplay: d }),

  selection: null,
  setSelection: (s) => set({ selection: s }),
  hovered: null,
  setHovered: (s) => set({ hovered: s }),

  showGrid: true,
  showMeasurements: true,
  wireframe: false,
  xray: false,
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<StudioState>),
}));
