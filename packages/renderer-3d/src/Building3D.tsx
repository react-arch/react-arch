import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, SoftShadows, ContactShadows, Environment, Lightformer } from "@react-three/drei";
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

const ACCENT = "#2563eb";
const PALETTE = {
  wall: "#ece7e0", // warm white plaster
  floor: "#c4a373", // light oak
  frame: "#262a31", // dark window/door frame
  glass: "#cfe3f0",
  door: "#7a5638",
};

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
    camera.near = Math.max(0.05, r * 0.02);
    camera.far = r * 8 + 40;
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.set(cx, cy, cz);
      controls.current.update();
    }
  }, [scene, camera]);
  return <OrbitControls ref={controls} makeDefault enableDamping />;
}

/** Procedural studio lighting (no external HDRI) for soft, realistic shading. */
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={2.2} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 12, 1]} />
      <Lightformer intensity={1.1} position={[6, 3, 6]} rotation={[0, -Math.PI / 4, 0]} scale={[8, 8, 1]} />
      <Lightformer intensity={0.8} position={[-6, 3, 4]} rotation={[0, Math.PI / 4, 0]} scale={[8, 8, 1]} />
      <Lightformer intensity={0.6} position={[0, 2, -8]} scale={[10, 6, 1]} />
    </Environment>
  );
}

export function Building3D(props: Building3DProps) {
  const { document: doc, floorIds } = props;
  const scene = useMemo(
    () => build3DScene(doc, { floorIds, exploded: props.exploded, explodeGap: props.explodeGap, showSlabs: props.showSlabs }),
    [doc, floorIds, props.exploded, props.explodeGap, props.showSlabs],
  );

  const isSelected = (id: string) => props.selected?.id === id;
  const wallOpacity = props.xray ? 0.18 : 1;

  return (
    <div className={props.className} style={{ width: "100%", height: "100%", background: "#0f1115" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [12, 10, 14], fov: 45 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
        }}
        onPointerMissed={() => props.onSelect?.(null)}
      >
        <color attach="background" args={["#0f1115"]} />

        <SoftShadows size={28} samples={16} focus={0.7} />
        <StudioEnv />
        <ambientLight intensity={0.35} />
        <hemisphereLight intensity={0.3} groundColor="#20222a" />
        <directionalLight
          position={[scene.center[0] + 14, scene.center[1] + 26, scene.center[2] + 12]}
          intensity={2.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
          shadow-normalBias={0.02}
        >
          <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.1, 120]} />
        </directionalLight>
        <directionalLight position={[scene.center[0] - 12, scene.center[1] + 10, scene.center[2] - 10]} intensity={0.4} />

        {/* Soft grounded shadow under the building */}
        <ContactShadows
          position={[scene.center[0], scene.floorY - 0.02, scene.center[2]]}
          scale={scene.radius * 3.2}
          resolution={1024}
          blur={2.2}
          opacity={0.5}
          far={scene.radius * 2}
          frames={1}
        />

        {scene.slabs.map((s) => (
          <mesh key={s.key} position={s.position} receiveShadow
            onClick={(e) => { e.stopPropagation(); props.onSelect?.({ kind: "floor", id: s.floorId }); }}>
            <boxGeometry args={s.size} />
            <meshStandardMaterial
              color={isSelected(s.floorId) ? ACCENT : PALETTE.floor}
              roughness={0.72}
              metalness={0}
              envMapIntensity={0.5}
              polygonOffset
              polygonOffsetFactor={isSelected(s.floorId) ? -4 : 1}
              polygonOffsetUnits={isSelected(s.floorId) ? -4 : 1}
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
                color={sel ? ACCENT : colorFor(doc, b.materialId, PALETTE.wall)}
                roughness={0.95}
                metalness={0}
                envMapIntensity={0.4}
                wireframe={props.wireframe}
                transparent={props.xray}
                opacity={wallOpacity}
                polygonOffset={sel}
                polygonOffsetFactor={sel ? -4 : 0}
                polygonOffsetUnits={sel ? -4 : 0}
              />
            </mesh>
          );
        })}

        {scene.panels.map((p) => {
          const sel = isSelected(p.entityId);
          const isGlass = p.kind === "window";
          const [w, h, d] = p.size;
          return (
            <group key={p.key} position={p.position} rotation={[0, p.rotationY, 0]}
              onClick={(e) => { e.stopPropagation(); props.onSelect?.({ kind: "opening", id: p.entityId }); }}>
              {/* frame */}
              <mesh castShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial
                  color={sel ? ACCENT : PALETTE.frame}
                  roughness={0.5}
                  metalness={0.25}
                  wireframe={props.wireframe}
                  polygonOffset={sel}
                  polygonOffsetFactor={sel ? -4 : 0}
                  polygonOffsetUnits={sel ? -4 : 0}
                />
              </mesh>
              {/* glass / door panel inset within the frame */}
              <mesh>
                <boxGeometry args={[w * 0.84, h * 0.84, isGlass ? d * 1.6 : d * 0.5]} />
                <meshStandardMaterial
                  color={sel ? ACCENT : isGlass ? PALETTE.glass : PALETTE.door}
                  roughness={isGlass ? 0.05 : 0.6}
                  metalness={isGlass ? 0.2 : 0}
                  envMapIntensity={isGlass ? 1.4 : 0.4}
                  transparent={isGlass || props.xray}
                  opacity={isGlass ? 0.32 : props.xray ? 0.3 : 1}
                  wireframe={props.wireframe}
                />
              </mesh>
            </group>
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
                roughness={0.6}
                metalness={0}
                envMapIntensity={0.5}
                wireframe={props.wireframe}
                transparent={props.xray}
                opacity={props.xray ? 0.4 : 1}
                polygonOffset={sel}
                polygonOffsetFactor={sel ? -4 : 0}
                polygonOffsetUnits={sel ? -4 : 0}
              />
            </mesh>
          );
        })}

        <CameraRig scene={scene} />
      </Canvas>
    </div>
  );
}
