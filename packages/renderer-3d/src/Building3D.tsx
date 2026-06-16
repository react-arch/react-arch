import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { BuildingDocument, EntityRef } from "@react-arch/core";
import { furnitureColor } from "@react-arch/core";
import { build3DScene, type Scene3D } from "./scene3d.js";

export interface Building3DProps {
  document: BuildingDocument;
  floorIds: string[] | "all";
  selected?: EntityRef | null;
  onSelect?: (ref: EntityRef | null) => void;
  exploded?: boolean;
  explodeGap?: number;
  wireframe?: boolean;
  xray?: boolean;
  showSlabs?: boolean;
  className?: string;
}

const ACCENT = "#4c8eff";

function colorFor(doc: BuildingDocument, materialId: string | undefined, fallback: string): string {
  if (!materialId) return fallback;
  return doc.materials.find((m) => m.id === materialId)?.baseColor ?? fallback;
}

function CameraRig({ scene }: { scene: Scene3D }) {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  useEffect(() => {
    const [cx, cy, cz] = scene.center;
    const r = scene.radius;
    camera.position.set(cx + r * 1.4, cy + r * 1.3, cz + r * 1.6);
    // Keep the near/far range tight for good depth-buffer precision (reduces
    // z-fighting between stacked floors that share a plane).
    camera.near = Math.max(0.05, r * 0.02);
    camera.far = r * 8 + 40;
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.set(cx, cy, cz);
      controls.current.update();
    }
  }, [scene, camera]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.1} />;
}

export function Building3D(props: Building3DProps) {
  const { document: doc, floorIds } = props;
  const scene = useMemo(
    () => build3DScene(doc, { floorIds, exploded: props.exploded, explodeGap: props.explodeGap, showSlabs: props.showSlabs }),
    [doc, floorIds, props.exploded, props.explodeGap, props.showSlabs],
  );

  const wallColor = colorFor(doc, undefined, "#e8e6e1");
  const isSelected = (id: string) => props.selected?.id === id;

  return (
    <div className={props.className} style={{ width: "100%", height: "100%", background: "#0f1115" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [12, 10, 14], fov: 45 }}
        gl={{ antialias: true }}
        onPointerMissed={() => props.onSelect?.(null)}
      >
        <color attach="background" args={["#0f1115"]} />
        <hemisphereLight intensity={0.55} groundColor="#1a1c22" />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[scene.center[0] + 20, scene.center[1] + 35, scene.center[2] + 15]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        {/* Ground reference grid */}
        <gridHelper args={[200, 200, "#2a2d35", "#1c1e24"]} position={[scene.center[0], -0.01, scene.center[2]]} />

        {scene.slabs.map((s) => (
          <mesh key={s.key} position={s.position} receiveShadow
            onClick={(e) => { e.stopPropagation(); props.onSelect?.({ kind: "floor", id: s.floorId }); }}>
            <boxGeometry args={s.size} />
            {/* polygonOffset pushes the slab slightly back in depth so it never
                ties with a coplanar wall-top from the floor below. */}
            <meshStandardMaterial
              color={isSelected(s.floorId) ? ACCENT : "#3a3d44"}
              roughness={0.95}
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          </mesh>
        ))}

        {scene.boxes.map((b) => {
          const sel = isSelected(b.entityId);
          return (
            <mesh key={b.key} position={b.position} rotation={[0, b.rotationY, 0]} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); props.onSelect?.({ kind: "wall", id: b.entityId }); }}>
              <boxGeometry args={b.size} />
              <meshStandardMaterial
                color={sel ? ACCENT : colorFor(doc, b.materialId, wallColor)}
                roughness={0.9}
                wireframe={props.wireframe}
                transparent={props.xray}
                opacity={props.xray ? 0.25 : 1}
              />
            </mesh>
          );
        })}

        {scene.panels.map((p) => {
          const sel = isSelected(p.entityId);
          const isGlass = p.kind === "window";
          return (
            <mesh key={p.key} position={p.position} rotation={[0, p.rotationY, 0]} castShadow
              onClick={(e) => { e.stopPropagation(); props.onSelect?.({ kind: "opening", id: p.entityId }); }}>
              <boxGeometry args={p.size} />
              <meshStandardMaterial
                color={sel ? ACCENT : isGlass ? "#bcd6e6" : "#6b4b2f"}
                roughness={isGlass ? 0.05 : 0.6}
                metalness={isGlass ? 0.1 : 0}
                transparent={isGlass || props.xray}
                opacity={isGlass ? 0.4 : props.xray ? 0.3 : 1}
                wireframe={props.wireframe}
              />
            </mesh>
          );
        })}

        {scene.objects.map((o) => {
          const sel = isSelected(o.entityId);
          return (
            <mesh key={o.key} position={o.position} rotation={[0, o.rotationY, 0]} castShadow receiveShadow
              onClick={(e) => { e.stopPropagation(); props.onSelect?.({ kind: "object", id: o.entityId }); }}>
              <boxGeometry args={o.size} />
              <meshStandardMaterial
                color={sel ? ACCENT : furnitureColor(o.objectType)}
                roughness={0.7}
                wireframe={props.wireframe}
                transparent={props.xray}
                opacity={props.xray ? 0.35 : 1}
              />
            </mesh>
          );
        })}

        <CameraRig scene={scene} />
      </Canvas>
    </div>
  );
}
