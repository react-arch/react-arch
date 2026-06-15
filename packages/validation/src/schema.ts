import { z } from "zod";

const finite = z.number().finite();
const vec2 = z.tuple([finite, finite]);
const vec3 = z.tuple([finite, finite, finite]);

export const WallSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  start: vec2,
  end: vec2,
  thickness: z.number().positive(),
  height: z.number().positive(),
  materialId: z.string().optional(),
  layerId: z.string().optional(),
  locked: z.boolean().optional(),
});

export const OpeningSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  wallId: z.string().min(1),
  type: z.enum(["door", "window", "opening"]),
  offset: finite,
  width: z.number().positive(),
  height: z.number().positive(),
  sillHeight: z.number().min(0),
  swing: z.enum(["in", "out"]).optional(),
  hinge: z.enum(["left", "right"]).optional(),
  materialId: z.string().optional(),
});

export const RoomSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  name: z.string(),
  polygon: z.array(vec2).min(3),
  boundaryWallIds: z.array(z.string()).optional(),
  floorMaterialId: z.string().optional(),
  ceilingMaterialId: z.string().optional(),
  usageType: z.string().optional(),
  height: z.number().positive().optional(),
});

export const BuildingObjectSchema = z.object({
  id: z.string().min(1),
  floorId: z.string().min(1),
  type: z.string(),
  position: vec3,
  rotation: vec3,
  scale: vec3,
  assetId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const FloorSchema = z.object({
  id: z.string().min(1),
  buildingId: z.string().min(1),
  name: z.string(),
  elevation: finite,
  height: z.number().positive(),
  visible: z.boolean(),
  locked: z.boolean(),
  walls: z.array(WallSchema),
  rooms: z.array(RoomSchema),
  openings: z.array(OpeningSchema),
  objects: z.array(BuildingObjectSchema),
});

export const BuildingSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  floors: z.array(FloorSchema),
});

export const MaterialSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  category: z.string(),
  baseColor: z.string(),
  roughness: z.number().optional(),
  metalness: z.number().optional(),
  opacity: z.number().optional(),
  textureUrl: z.string().optional(),
});

export const BuildingDocumentSchema = z.object({
  id: z.string().min(1),
  version: z.string(),
  name: z.string(),
  units: z.enum(["metric", "imperial"]),
  site: z.unknown().optional(),
  buildings: z.array(BuildingSchema),
  materials: z.array(MaterialSchema),
  assets: z.array(z.unknown()),
  metadata: z.record(z.unknown()),
});
