import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { allFloors, furnitureColor, furnitureDims, type BuildingDocument } from "@react-arch/core";
import { bounds, wallBoxes, wallDirection } from "@react-arch/geometry";

export interface GltfExportOptions {
  floorIds?: string[] | "all";
  binary?: boolean;
}

/** Build a Three.js scene mirroring the 3D renderer's geometry. */
export function buildExportScene(
  doc: BuildingDocument,
  floorIds: string[] | "all" = "all",
): THREE.Group {
  const root = new THREE.Group();
  root.name = doc.name;

  const matFor = (color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.9, ...opts });
  const colorFor = (materialId: string | undefined, fallback: string) =>
    materialId ? doc.materials.find((m) => m.id === materialId)?.baseColor ?? fallback : fallback;

  const slabMat = matFor("#9b9b97");

  for (const floor of allFloors(doc)) {
    const visible = floorIds === "all" ? floor.visible : floorIds.includes(floor.id);
    if (!visible) continue;
    const floorGroup = new THREE.Group();
    floorGroup.name = floor.name;
    const el = floor.elevation;

    const openingsByWall = new Map<string, typeof floor.openings>();
    for (const o of floor.openings) {
      const arr = openingsByWall.get(o.wallId) ?? [];
      arr.push(o);
      openingsByWall.set(o.wallId, arr);
    }

    for (const wall of floor.walls) {
      const dir = wallDirection(wall);
      const theta = Math.atan2(dir[1], dir[0]);
      const opens = (openingsByWall.get(wall.id) ?? []).map((o) => ({
        offset: o.offset, width: o.width, height: o.height, sillHeight: o.sillHeight,
      }));
      for (const s of wallBoxes(wall, opens, wall.height, wall.thickness / 2)) {
        const along = (s.along0 + s.along1) / 2;
        const px = wall.start[0] + dir[0] * along;
        const py = wall.start[1] + dir[1] * along;
        const geo = new THREE.BoxGeometry(Math.max(s.along1 - s.along0, 0.001), Math.max(s.z1 - s.z0, 0.001), wall.thickness);
        const mesh = new THREE.Mesh(geo, matFor(colorFor(wall.materialId, "#e8e6e1")));
        mesh.position.set(px, el + (s.z0 + s.z1) / 2, py);
        mesh.rotation.y = -theta;
        floorGroup.add(mesh);
      }
    }

    const wallById = new Map(floor.walls.map((w) => [w.id, w]));
    for (const o of floor.openings) {
      if (o.type === "opening") continue;
      const wall = wallById.get(o.wallId);
      if (!wall) continue;
      const dir = wallDirection(wall);
      const theta = Math.atan2(dir[1], dir[0]);
      const px = wall.start[0] + dir[0] * o.offset;
      const py = wall.start[1] + dir[1] * o.offset;
      const depth = o.type === "window" ? 0.05 : wall.thickness * 0.6;
      const geo = new THREE.BoxGeometry(Math.max(o.width - 0.04, 0.05), Math.max(o.height - 0.04, 0.05), depth);
      const mesh = new THREE.Mesh(
        geo,
        o.type === "window"
          ? matFor(colorFor(o.materialId, "#bcd6e6"), { transparent: true, opacity: 0.4, roughness: 0.05 })
          : matFor(colorFor(o.materialId, "#6b4b2f"), { roughness: 0.6 }),
      );
      mesh.position.set(px, el + o.sillHeight + o.height / 2, py);
      mesh.rotation.y = -theta;
      floorGroup.add(mesh);
    }

    for (const ob of floor.objects) {
      const d = furnitureDims(ob.type, ob.scale);
      const geo = new THREE.BoxGeometry(d.width, d.height, d.depth);
      const mesh = new THREE.Mesh(geo, matFor(furnitureColor(ob.type), { roughness: 0.7 }));
      mesh.name = ob.id;
      mesh.position.set(ob.position[0], el + ob.position[2] + d.height / 2, ob.position[1]);
      mesh.rotation.y = -ob.rotation[2];
      floorGroup.add(mesh);
    }

    if (floor.walls.length > 0) {
      const b = bounds(floor.walls.flatMap((w) => [w.start, w.end]));
      const geo = new THREE.BoxGeometry(b.width + 0.4, 0.14, b.height + 0.4);
      const slab = new THREE.Mesh(geo, slabMat);
      slab.position.set((b.min[0] + b.max[0]) / 2, el - 0.07, (b.min[1] + b.max[1]) / 2);
      floorGroup.add(slab);
    }

    root.add(floorGroup);
  }
  return root;
}

/** Export the building as GLTF (JSON) or GLB (binary ArrayBuffer). */
export function exportGLTF(
  doc: BuildingDocument,
  options: GltfExportOptions = {},
): Promise<ArrayBuffer | object> {
  const scene = buildExportScene(doc, options.floorIds ?? "all");
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(result as ArrayBuffer | object),
      (err) => reject(err),
      { binary: options.binary ?? true },
    );
  });
}
