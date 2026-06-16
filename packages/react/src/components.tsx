import { createElement, type ReactNode } from "react";
import { TAG, type RoomSide } from "./tags.js";

type WithChildren<T> = T & { children?: ReactNode };
const h = (tag: string, props: object) =>
  createElement(tag, props as Record<string, unknown>);

export interface BuildingProps {
  id?: string;
  name?: string;
  units?: "metric" | "imperial";
}
export function Building(props: WithChildren<BuildingProps>) {
  return h(TAG.building, props);
}

export interface FloorProps {
  id?: string;
  name?: string;
  elevation?: number;
  height?: number;
}
export function Floor(props: WithChildren<FloorProps>) {
  return h(TAG.floor, props);
}

export interface RoomProps {
  id?: string;
  name?: string;
  /** Top-left corner X (metres, X increases right). */
  x?: number;
  /** Top-left corner Y (metres, Y increases down). */
  y?: number;
  /** Extent along X. */
  width?: number;
  /** Extent along Y. */
  depth?: number;
  height?: number;
  wallThickness?: number;
  floorMaterial?: string;
  ceilingMaterial?: string;
  usage?: string;
}
export function Room(props: WithChildren<RoomProps>) {
  return h(TAG.room, props);
}

export interface WallProps {
  id?: string;
  from: [number, number];
  to: [number, number];
  thickness?: number;
  height?: number;
  materialId?: string;
}
export function Wall(props: WallProps) {
  return h(TAG.wall, props);
}

export interface OpeningCommonProps {
  id?: string;
  /** Which side of the parent room this attaches to. */
  wall?: RoomSide;
  /** Distance along the wall centerline from its start corner. */
  offset?: number;
  width?: number;
  height?: number;
  sillHeight?: number;
}
export function Door(props: OpeningCommonProps) {
  return h(TAG.door, props);
}
export function Window(props: OpeningCommonProps) {
  return h(TAG.window, props);
}
export function Opening(props: OpeningCommonProps) {
  return h(TAG.opening, props);
}

export interface FurnitureProps {
  id?: string;
  type: string;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  assetId?: string;
}
export function Furniture(props: FurnitureProps) {
  return h(TAG.furniture, props);
}
/** Alias used inside reusable room modules. */
export const Fixture = Furniture;

export interface MaterialProps {
  id: string;
  name?: string;
  category?: string;
  baseColor: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  textureUrl?: string;
}
export function Material(props: MaterialProps) {
  return h(TAG.material, props);
}

export function Group(props: WithChildren<{ id?: string }>) {
  return h(TAG.group, props);
}

// Reserved primitives — accepted in the tree, modelled minimally for the MVP.
export function Slab(props: WithChildren<{ id?: string }>) {
  return h(TAG.slab, props);
}
export interface RoofProps {
  id?: string;
  type?: "flat" | "gable" | "hip";
  /** Pitch in degrees for gable/hip (default 30). */
  pitch?: number;
  /** Eave overhang in metres (default 0.3). */
  overhang?: number;
  /** Slab thickness for flat roofs (default 0.3). */
  thickness?: number;
  materialId?: string;
}
export function Roof(props: RoofProps) {
  return h(TAG.roof, props);
}
export function Stairs(props: WithChildren<{ id?: string }>) {
  return h(TAG.stairs, props);
}
