import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useLoader } from "@react-three/fiber";
import { Edges, Html, Line, OrbitControls, PerspectiveCamera, Sky } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { useTwinStore } from "../store/useTwinStore";
import type { BuildingObject, SensorData, Vector3 } from "../types";

const sensorColors: Record<SensorData["status"], string> = {
  normal: "#2dd4bf",
  warning: "#fbbf24",
  danger: "#fb3f5f",
  offline: "#64748b"
};

const sensorTypeLabel: Record<SensorData["type"], string> = {
  temperature: "温",
  humidity: "湿",
  smoke: "烟",
  energy: "能",
  door: "门",
  camera: "视",
  waterPressure: "压",
  alarm: "警",
  aiRisk: "AI"
};

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const surfaceTextureUrls: string[] = [
  assetUrl("/textures/procedural/concrete-panel.png"),
  assetUrl("/textures/procedural/asphalt-fine.png"),
  assetUrl("/textures/threejs/grasslight-big.jpg"),
  assetUrl("/textures/threejs/water.jpg"),
  assetUrl("/textures/procedural/brushed-metal.png"),
  assetUrl("/textures/procedural/glass-grid.png"),
  assetUrl("/textures/threejs/brick_diffuse.jpg")
];

type SurfaceKind = "concrete" | "asphalt" | "grass" | "water" | "metal" | "glass" | "masonry";
type SurfaceTextures = Record<SurfaceKind, THREE.Texture>;

function cloneTexture(texture: THREE.Texture, repeat: [number, number], srgb = true) {
  const cloned = texture.clone();
  cloned.wrapS = THREE.RepeatWrapping;
  cloned.wrapT = THREE.RepeatWrapping;
  cloned.repeat.set(repeat[0], repeat[1]);
  cloned.anisotropy = 8;
  if (srgb) cloned.colorSpace = THREE.SRGBColorSpace;
  cloned.needsUpdate = true;
  return cloned;
}

function useSurfaceTextures(): SurfaceTextures {
  const [concrete, asphalt, grass, water, metal, glass, masonry] = useLoader(THREE.TextureLoader, surfaceTextureUrls) as THREE.Texture[];

  return useMemo(
    () => ({
      concrete: cloneTexture(concrete, [3.2, 3.2]),
      asphalt: cloneTexture(asphalt, [9, 5]),
      grass: cloneTexture(grass, [5, 5]),
      water: cloneTexture(water, [4, 4]),
      metal: cloneTexture(metal, [2.6, 2.6]),
      glass: cloneTexture(glass, [3.4, 3.4]),
      masonry: cloneTexture(masonry, [2.2, 1.6])
    }),
    [asphalt, concrete, glass, grass, masonry, metal, water]
  );
}

function surfaceForBuilding(type: BuildingObject["type"], textures: SurfaceTextures) {
  switch (type) {
    case "road":
      return { map: textures.asphalt, bumpMap: textures.asphalt, bumpScale: 0.045, roughness: 0.9, metalness: 0.02 };
    case "water":
      return { map: textures.water, bumpMap: textures.water, bumpScale: 0.08, roughness: 0.16, metalness: 0.02, emissive: "#0e7490", emissiveIntensity: 0.12 };
    case "green":
      return { map: textures.grass, bumpMap: textures.grass, bumpScale: 0.06, roughness: 0.96, metalness: 0.0 };
    case "stair":
      return { map: textures.glass, bumpMap: textures.glass, bumpScale: 0.025, roughness: 0.2, metalness: 0.12, emissive: "#0891b2", emissiveIntensity: 0.16 };
    case "equipment":
      return { map: textures.metal, bumpMap: textures.metal, bumpScale: 0.035, roughness: 0.36, metalness: 0.28 };
    case "annex":
      return { map: textures.masonry, bumpMap: textures.masonry, bumpScale: 0.035, roughness: 0.72, metalness: 0.04 };
    case "exit":
      return { map: textures.metal, bumpMap: textures.metal, bumpScale: 0.028, roughness: 0.48, metalness: 0.18, emissive: "#14532d", emissiveIntensity: 0.14 };
    default:
      return { map: textures.concrete, bumpMap: textures.concrete, bumpScale: 0.045, roughness: 0.66, metalness: 0.04 };
  }
}

function vec3(v: Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

function ImportedModel() {
  const [model, setModel] = useState<{ scene: THREE.Group; kind: "glb" | "fbx" } | null>(null);

  useEffect(() => {
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();
    gltfLoader.load(
      assetUrl("/models/library_complex.glb"),
      (gltf) => setModel({ scene: gltf.scene, kind: "glb" }),
      undefined,
      () => {
        fbxLoader.load(
          assetUrl("/models/library_complex.fbx"),
          (fbx) => {
            fbx.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhongMaterial) {
                  child.material.transparent = true;
                  child.material.opacity = 0.9;
                }
              }
            });
            setModel({ scene: fbx, kind: "fbx" });
          },
          undefined,
          () => setModel(null)
        );
      }
    );
  }, []);

  if (!model) return null;
  return <primitive object={model.scene} position={[0, 0, 0]} scale={model.kind === "fbx" ? 0.02 : 1} />;
}

function BuildingMesh({ building, editor }: { building: BuildingObject; editor: boolean }) {
  const selectedBuildingId = useTwinStore((state) => state.selectedBuildingId);
  const selectBuilding = useTwinStore((state) => state.selectBuilding);
  const transparentMode = useTwinStore((state) => state.transparentMode);
  const floors = useTwinStore((state) => state.floors);
  const fire = useTwinStore((state) => state.fire);
  const patchBuildingLocal = useTwinStore((state) => state.patchBuildingLocal);
  const saveBuilding = useTwinStore((state) => state.saveBuilding);
  const dragging = useRef(false);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const textures = useSurfaceTextures();

  const floorVisible = building.floor ? floors.find((floor) => floor.floor === building.floor)?.visible !== false : true;
  const isSelected = selectedBuildingId === building.id;
  const opacity = transparentMode || fire.status === "active" ? Math.min(building.opacity ?? 0.82, 0.45) : building.opacity ?? 0.82;
  const color = building.color ?? "#7dd3fc";
  const surface = surfaceForBuilding(building.type, textures);

  useFrame(({ clock }) => {
    if (building.type !== "water" || !materialRef.current?.map) return;
    materialRef.current.map.offset.set(clock.elapsedTime * 0.015, clock.elapsedTime * 0.009);
  });

  if (building.visible === false || !floorVisible) return null;

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    selectBuilding(building.id);
    if (!editor || !building.editable) return;
    dragging.current = true;
  }

  function onPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current || !editor || !building.editable) return;
    event.stopPropagation();
    patchBuildingLocal(building.id, {
      position: {
        ...building.position,
        x: Number(event.point.x.toFixed(2)),
        z: Number(event.point.z.toFixed(2))
      }
    });
  }

  function onPointerUp(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current) return;
    dragging.current = false;
    event.stopPropagation();
    void saveBuilding(building.id);
  }

  return (
    <mesh
      position={vec3(building.position)}
      rotation={vec3(building.rotation)}
      scale={vec3(building.scale)}
      onClick={(event) => {
        event.stopPropagation();
        selectBuilding(building.id);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color={isSelected ? "#fbbf24" : color}
        map={surface.map}
        bumpMap={surface.bumpMap}
        bumpScale={surface.bumpScale}
        emissive={surface.emissive ?? "#000000"}
        emissiveIntensity={surface.emissiveIntensity ?? 0}
        transparent={opacity < 1 || building.type === "water" || building.type === "stair"}
        opacity={isSelected ? Math.max(opacity, 0.72) : opacity}
        roughness={surface.roughness}
        metalness={surface.metalness}
      />
      <Edges color={isSelected ? "#fde68a" : "rgba(191, 236, 255, 0.7)"} />
      {isSelected ? (
        <Html center position={[0, 0.62, 0]} className="scene-label">
          {building.name}
        </Html>
      ) : null}
    </mesh>
  );
}

function FloorPlates() {
  const floors = useTwinStore((state) => state.floors);
  const textures = useSurfaceTextures();
  return (
    <>
      {[1, 2, 3, 4, 5].map((floor) => {
        if (floors.find((item) => item.floor === floor)?.visible === false) return null;
        return (
          <mesh key={floor} position={[0, floor * 3.6, 0]} scale={[22.6, 0.07, 16.6]} receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#c8f4ff" map={textures.concrete} bumpMap={textures.concrete} bumpScale={0.025} transparent opacity={0.18} roughness={0.7} metalness={0.02} />
            <Edges color="rgba(94, 234, 212, 0.38)" />
          </mesh>
        );
      })}
    </>
  );
}

function Trees() {
  const trees = useMemo(() => {
    const points: Array<[number, number]> = [];
    for (let i = 0; i < 44; i += 1) {
      const angle = i * 1.91;
      const radius = 20 + (i % 7) * 4;
      points.push([Math.cos(angle) * radius - 8, Math.sin(angle) * radius + 8]);
    }
    return points;
  }, []);

  return (
    <>
      {trees.map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.18, 1.3, 8]} />
            <meshStandardMaterial color="#6f4c2f" />
          </mesh>
          <mesh position={[0, 1.55, 0]} castShadow>
            <sphereGeometry args={[0.9 + (index % 3) * 0.08, 10, 10]} />
            <meshStandardMaterial color={index % 8 === 0 ? "#b8792f" : "#2c7a52"} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function DetailBox({
  position,
  scale,
  color,
  opacity = 1,
  emissive,
  rotation = [0, 0, 0]
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity?: number;
  emissive?: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.45 : 0}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.38}
        metalness={0.08}
      />
    </mesh>
  );
}

function FacadeGrid() {
  const columns = Array.from({ length: 13 }, (_, index) => -10.2 + index * 1.7);
  const rows = Array.from({ length: 5 }, (_, index) => 2.4 + index * 3.25);
  const sideRows = Array.from({ length: 5 }, (_, index) => 2.55 + index * 3.18);
  const sideColumns = Array.from({ length: 8 }, (_, index) => -6.8 + index * 1.95);

  return (
    <group>
      {rows.flatMap((y, row) =>
        columns.map((x, col) => (
          <DetailBox key={`front-glass-${row}-${col}`} position={[x, y, 8.12]} scale={[1.26, 1.95, 0.08]} color="#b9f3ff" opacity={0.42} emissive="#2dd4bf" />
        ))
      )}
      {rows.flatMap((y, row) =>
        columns.map((x, col) => (
          <DetailBox key={`back-glass-${row}-${col}`} position={[x, y, -8.12]} scale={[1.26, 1.72, 0.08]} color="#91d7ed" opacity={0.28} />
        ))
      )}
      {sideRows.flatMap((y, row) =>
        sideColumns.map((z, col) => (
          <DetailBox key={`east-glass-${row}-${col}`} position={[11.08, y, z]} scale={[0.08, 1.68, 1.25]} color="#9de7f5" opacity={0.34} />
        ))
      )}
      {sideRows.flatMap((y, row) =>
        sideColumns.map((z, col) => (
          <DetailBox key={`west-glass-${row}-${col}`} position={[-11.08, y, z]} scale={[0.08, 1.68, 1.25]} color="#9de7f5" opacity={0.3} />
        ))
      )}
      {columns.map((x) => (
        <DetailBox key={`front-fin-${x}`} position={[x + 0.82, 9.1, 8.28]} scale={[0.08, 16.2, 0.18]} color="#d7f8ff" opacity={0.68} />
      ))}
      {sideColumns.map((z) => (
        <DetailBox key={`east-fin-${z}`} position={[11.25, 9.1, z + 0.92]} scale={[0.18, 15.8, 0.08]} color="#d7f8ff" opacity={0.48} />
      ))}
      {rows.map((y) => (
        <DetailBox key={`floor-band-${y}`} position={[0, y + 1.14, 8.35]} scale={[22.6, 0.1, 0.16]} color="#e6fbff" opacity={0.62} />
      ))}
    </group>
  );
}

function EntranceDetails() {
  return (
    <group>
      <DetailBox position={[0, 1.75, 9.05]} scale={[7.2, 3.2, 0.24]} color="#e8fbff" opacity={0.52} emissive="#38bdf8" />
      <DetailBox position={[0, 3.48, 10.72]} scale={[10.5, 0.32, 4.2]} color="#effcff" opacity={0.62} />
      <DetailBox position={[0, 1.75, 11.88]} scale={[8.8, 0.18, 0.24]} color="#b7e6f2" opacity={0.95} />
      {[-2, -1, 0, 1, 2].map((step) => (
        <DetailBox key={`step-${step}`} position={[0, 0.16 + step * 0.045, 13.4 + step * 0.52]} scale={[12 - step * 0.8, 0.14, 0.48]} color="#dbe8ec" opacity={0.96} />
      ))}
      <DetailBox position={[-7.2, 0.24, 13.6]} scale={[0.72, 0.14, 5.8]} color="#d9f0f4" opacity={0.9} rotation={[0, 0.08, 0]} />
      <DetailBox position={[7.2, 0.24, 13.6]} scale={[0.72, 0.14, 5.8]} color="#d9f0f4" opacity={0.9} rotation={[0, -0.08, 0]} />
      {[-5.6, -3.2, 3.2, 5.6].map((x) => (
        <mesh key={`bollard-${x}`} position={[x, 0.55, 15.9]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 1.05, 14]} />
          <meshStandardMaterial color="#5cc9e8" emissive="#0ea5e9" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function InteriorDetails() {
  const shelfRows = [1, 2, 3, 4].flatMap((floor) =>
    [-5.8, -2.8, 2.8, 5.8].map((x, index) => ({
      key: `${floor}-${x}`,
      position: [x, floor * 3.6 - 1.25, -3.4 + (index % 2) * 4.8] as [number, number, number],
      floor
    }))
  );
  const desks = [1, 2, 3].flatMap((floor) =>
    [-6, 0, 6].flatMap((x) =>
      [-5.5, 0.5, 5.8].map((z) => ({
        key: `${floor}-${x}-${z}`,
        position: [x, floor * 3.6 - 1.4, z] as [number, number, number]
      }))
    )
  );

  return (
    <group>
      {shelfRows.map((item) => (
        <group key={`shelf-${item.key}`} position={item.position}>
          <DetailBox position={[0, 0.5, 0]} scale={[0.32, 1.65, 3.2]} color="#7b5a3a" opacity={0.82} />
          {[0.0, 0.42, 0.84, 1.24].map((y) => (
            <DetailBox key={y} position={[0, y, 0]} scale={[0.36, 0.05, 3.35]} color="#c7a46c" opacity={0.9} />
          ))}
        </group>
      ))}
      {desks.map((desk) => (
        <group key={`desk-${desk.key}`} position={desk.position}>
          <DetailBox position={[0, 0.45, 0]} scale={[2.1, 0.12, 0.82]} color="#c2d4dc" opacity={0.9} />
          <DetailBox position={[-0.82, 0.18, -0.24]} scale={[0.12, 0.36, 0.12]} color="#8399a7" />
          <DetailBox position={[0.82, 0.18, -0.24]} scale={[0.12, 0.36, 0.12]} color="#8399a7" />
          <DetailBox position={[-0.82, 0.18, 0.24]} scale={[0.12, 0.36, 0.12]} color="#8399a7" />
          <DetailBox position={[0.82, 0.18, 0.24]} scale={[0.12, 0.36, 0.12]} color="#8399a7" />
        </group>
      ))}
      {[1, 2, 3, 4, 5].map((floor) => (
        <group key={`fire-equip-${floor}`} position={[-10.9, floor * 3.6 - 1.55, 6.8]}>
          <DetailBox position={[0, 0.7, 0]} scale={[0.16, 1.1, 0.68]} color="#ef4444" emissive="#ef4444" opacity={0.95} />
          <DetailBox position={[0.04, 1.38, 0]} scale={[0.18, 0.16, 0.86]} color="#fef2f2" opacity={0.9} />
        </group>
      ))}
      {[-8, -4, 0, 4, 8].map((x) =>
        [1, 2, 3, 4, 5].map((floor) => (
          <mesh key={`sprinkler-${floor}-${x}`} position={[x, floor * 3.6 - 0.12, -7.4]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.18, 0.18, 16]} />
            <meshStandardMaterial color="#e5f6ff" metalness={0.45} roughness={0.18} />
          </mesh>
        ))
      )}
    </group>
  );
}

function RoofAndMEPDetails() {
  return (
    <group>
      <DetailBox position={[0, 18.42, 0]} scale={[23.5, 0.28, 17.2]} color="#d8edf3" opacity={0.42} />
      <DetailBox position={[0, 18.78, -1.2]} scale={[8.4, 0.45, 5.4]} color="#c9f2ff" opacity={0.34} emissive="#38bdf8" />
      {[-7, 1, 7].map((x, index) => (
        <group key={`hvac-${index}`} position={[x, 19.18, 5.2 - index * 3.2]}>
          <DetailBox position={[0, 0, 0]} scale={[2.8, 0.62, 1.5]} color="#8aa0ad" opacity={0.92} />
          <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.44, 0.44, 0.09, 28]} />
            <meshStandardMaterial color="#c9d7df" metalness={0.18} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {[-11.5, 11.5].map((x) => (
        <DetailBox key={`roof-rail-x-${x}`} position={[x, 19.0, 0]} scale={[0.08, 0.72, 17.4]} color="#e7f8ff" opacity={0.7} />
      ))}
      {[-8.7, 8.7].map((z) => (
        <DetailBox key={`roof-rail-z-${z}`} position={[0, 19.0, z]} scale={[23.6, 0.72, 0.08]} color="#e7f8ff" opacity={0.7} />
      ))}
    </group>
  );
}

function AnnexDetails() {
  return (
    <group>
      {[-1, 1].map((side) =>
        Array.from({ length: 8 }, (_, index) => (
          <DetailBox
            key={`annex-east-window-${side}-${index}`}
            position={[28 - 8.4 + index * 2.4, 5.3, 2 + side * 6.12]}
            scale={[1.34, 2.1, 0.08]}
            color="#bceeff"
            opacity={0.32}
          />
        ))
      )}
      {Array.from({ length: 7 }, (_, index) => (
        <DetailBox key={`hall-rib-${index}`} position={[-32.2 + index * 2.4, 8.35, 11.05]} scale={[0.09, 7.2, 0.22]} color="#d8f2f7" opacity={0.72} />
      ))}
      <DetailBox position={[28, 10.35, 2]} scale={[20.6, 0.25, 12.6]} color="#eefcff" opacity={0.45} />
      <DetailBox position={[-25, 8.35, 4]} scale={[16.6, 0.25, 14.6]} color="#eefcff" opacity={0.42} />
    </group>
  );
}

function AtriumPrecisionDetails() {
  const ribs = Array.from({ length: 9 }, (_, index) => -4 + index);
  const ringLevels = [4.1, 7.7, 11.3, 14.9, 18.5];
  const bridgeLevels = [7.8, 11.4, 15.0];

  return (
    <group>
      <DetailBox position={[0, 9.8, -0.5]} scale={[9.6, 18.8, 8.6]} color="#b9f3ff" opacity={0.12} emissive="#22d3ee" />
      {ribs.map((x) => (
        <DetailBox key={`atrium-front-rib-${x}`} position={[x, 10.2, 3.9]} scale={[0.08, 17.6, 0.12]} color="#dff8ff" opacity={0.72} />
      ))}
      {ribs.map((x) => (
        <DetailBox key={`atrium-back-rib-${x}`} position={[x, 10.2, -4.9]} scale={[0.08, 17.6, 0.12]} color="#dff8ff" opacity={0.54} />
      ))}
      {ribs.slice(1, -1).map((z) => (
        <DetailBox key={`atrium-east-rib-${z}`} position={[4.9, 10.2, z - 0.5]} scale={[0.12, 17.6, 0.08]} color="#dff8ff" opacity={0.54} />
      ))}
      {ribs.slice(1, -1).map((z) => (
        <DetailBox key={`atrium-west-rib-${z}`} position={[-4.9, 10.2, z - 0.5]} scale={[0.12, 17.6, 0.08]} color="#dff8ff" opacity={0.54} />
      ))}
      {ringLevels.map((y) => (
        <group key={`atrium-ring-${y}`}>
          <DetailBox position={[0, y, 4.04]} scale={[9.8, 0.12, 0.18]} color="#e6fbff" opacity={0.68} />
          <DetailBox position={[0, y, -5.04]} scale={[9.8, 0.12, 0.18]} color="#e6fbff" opacity={0.48} />
          <DetailBox position={[5.02, y, -0.5]} scale={[0.18, 0.12, 8.9]} color="#e6fbff" opacity={0.48} />
          <DetailBox position={[-5.02, y, -0.5]} scale={[0.18, 0.12, 8.9]} color="#e6fbff" opacity={0.48} />
        </group>
      ))}
      {bridgeLevels.map((y, index) => (
        <group key={`atrium-bridge-${y}`}>
          <DetailBox position={[0, y, -0.5]} scale={[8.2, 0.16, 1.06]} color="#d9f7ff" opacity={0.4} />
          <DetailBox position={[0, y + 0.48, -1.08]} scale={[8.1, 0.08, 0.12]} color="#effcff" opacity={0.62} />
          <DetailBox position={[0, y + 0.48, 0.08]} scale={[8.1, 0.08, 0.12]} color="#effcff" opacity={0.62} />
          {[-3.2, -1.6, 0, 1.6, 3.2].map((x) => (
            <DetailBox key={`atrium-bridge-post-${index}-${x}`} position={[x, y + 0.33, -1.08]} scale={[0.06, 0.72, 0.08]} color="#e8fbff" opacity={0.68} />
          ))}
        </group>
      ))}
      <DetailBox position={[0, 20.4, -0.5]} scale={[10.4, 0.24, 9.2]} color="#e7fbff" opacity={0.36} emissive="#38bdf8" />
      {[-3.9, -2.6, -1.3, 0, 1.3, 2.6, 3.9].map((x) => (
        <DetailBox key={`atrium-skylight-bar-${x}`} position={[x, 20.68, -0.5]} scale={[0.08, 0.18, 9.35]} color="#ffffff" opacity={0.72} />
      ))}
      {[-4.2, -2.1, 0, 2.1, 4.2].map((z) => (
        <DetailBox key={`atrium-skylight-cross-${z}`} position={[0, 20.72, z - 0.5]} scale={[10.55, 0.16, 0.08]} color="#ffffff" opacity={0.58} />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <DetailBox
          key={`atrium-diagonal-${index}`}
          position={[index % 2 === 0 ? -2.5 : 2.5, 11.5, index < 2 ? 3.72 : -4.72]}
          scale={[0.08, 10.8, 0.08]}
          rotation={[0, 0, index % 2 === 0 ? 0.3 : -0.3]}
          color="#9de7f5"
          opacity={0.58}
        />
      ))}
      <group position={[3.55, 9.0, -3.1]}>
        <DetailBox position={[0, 0, 0]} scale={[1.16, 15.8, 1.16]} color="#65d9e9" opacity={0.32} emissive="#22d3ee" />
        {[1, 2, 3, 4].map((floor) => (
          <DetailBox key={`atrium-lift-door-${floor}`} position={[0, floor * 3.25 - 6.9, 0.62]} scale={[0.72, 0.88, 0.08]} color="#e6fbff" opacity={0.72} />
        ))}
      </group>
    </group>
  );
}

function EastAnnexPrecisionDetails() {
  const xWindows = Array.from({ length: 9 }, (_, index) => 19.2 + index * 2.2);
  const levels = [2.9, 5.8, 8.65];
  const zWindows = Array.from({ length: 5 }, (_, index) => -2.8 + index * 2.35);

  return (
    <group>
      <DetailBox position={[28, 10.72, 2]} scale={[21.2, 0.28, 13.0]} color="#e7f8ff" opacity={0.55} />
      <DetailBox position={[28, 10.94, 2]} scale={[17.2, 0.08, 9.2]} color="#6ee7f9" opacity={0.24} emissive="#22d3ee" />
      {levels.flatMap((y, row) =>
        xWindows.map((x, col) => (
          <DetailBox key={`east-annex-south-window-${row}-${col}`} position={[x, y, 8.18]} scale={[1.38, 1.05, 0.08]} color="#c9f7ff" opacity={0.42} emissive="#38bdf8" />
        ))
      )}
      {levels.flatMap((y, row) =>
        xWindows.map((x, col) => (
          <DetailBox key={`east-annex-north-window-${row}-${col}`} position={[x, y, -4.18]} scale={[1.38, 1.05, 0.08]} color="#a8e4f4" opacity={0.28} />
        ))
      )}
      {levels.flatMap((y, row) =>
        zWindows.map((z, col) => (
          <DetailBox key={`east-annex-east-window-${row}-${col}`} position={[38.18, y, z]} scale={[0.08, 1.05, 1.32]} color="#c9f7ff" opacity={0.36} />
        ))
      )}
      {levels.map((y) => (
        <group key={`east-annex-band-${y}`}>
          <DetailBox position={[28, y + 0.78, 8.3]} scale={[20.8, 0.1, 0.14]} color="#eefcff" opacity={0.72} />
          <DetailBox position={[28, y - 0.78, 8.3]} scale={[20.8, 0.1, 0.14]} color="#7dd3fc" opacity={0.28} />
          <DetailBox position={[28, y + 0.78, -4.3]} scale={[20.8, 0.1, 0.14]} color="#eefcff" opacity={0.48} />
        </group>
      ))}
      {xWindows.map((x) => (
        <DetailBox key={`east-annex-sunshade-${x}`} position={[x, 6.0, 8.45]} scale={[0.12, 7.2, 0.28]} color="#dff8ff" opacity={0.52} />
      ))}
      <group position={[20.8, 1.62, 8.72]}>
        <DetailBox position={[0, 0, 0]} scale={[4.7, 2.7, 0.32]} color="#e8fbff" opacity={0.56} emissive="#38bdf8" />
        <DetailBox position={[0, 1.52, 1.28]} scale={[6.1, 0.24, 2.72]} color="#f0fbff" opacity={0.74} />
        {[-2, -1, 0, 1, 2].map((step) => (
          <DetailBox key={`east-annex-entry-step-${step}`} position={[0, -1.32 + step * 0.05, 2.2 + step * 0.38]} scale={[6.6 - step * 0.52, 0.12, 0.34]} color="#d8e8ed" opacity={0.95} />
        ))}
      </group>
      <group position={[35.6, 0.8, -4.8]}>
        <DetailBox position={[0, 0.35, 0]} scale={[4.4, 1.1, 0.42]} color="#748899" opacity={0.85} />
        <DetailBox position={[0, 1.18, -0.22]} scale={[4.8, 0.22, 1.3]} color="#9fb2bf" opacity={0.9} />
      </group>
      {[-5.0, -2.4, 0.2, 2.8, 5.4].map((z) => (
        <DetailBox key={`east-annex-service-louver-${z}`} position={[38.35, 4.2, z]} scale={[0.1, 2.25, 1.3]} color="#6f8493" opacity={0.82} />
      ))}
      {[-5.8, -3.2, -0.6, 2.0, 4.6].map((z) => (
        <DetailBox key={`east-annex-service-louver-line-${z}`} position={[38.44, 4.2, z]} scale={[0.06, 2.36, 0.08]} color="#d9f7ff" opacity={0.42} />
      ))}
      {[-5.2, -1.8, 1.6, 5.0].map((z) => (
        <group key={`east-annex-roof-unit-${z}`} position={[23.0 + z, 11.18, 5.3 - z * 0.18]}>
          <DetailBox position={[0, 0, 0]} scale={[2.1, 0.46, 1.05]} color="#899fab" opacity={0.92} />
          <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.08, 24]} />
            <meshStandardMaterial color="#d4e2e8" metalness={0.2} roughness={0.32} />
          </mesh>
        </group>
      ))}
      {[-9.7, 9.7].map((x) => (
        <DetailBox key={`east-annex-roof-rail-x-${x}`} position={[28 + x, 11.22, 2]} scale={[0.08, 0.72, 12.8]} color="#eefcff" opacity={0.58} />
      ))}
      {[-5.9, 5.9].map((z) => (
        <DetailBox key={`east-annex-roof-rail-z-${z}`} position={[28, 11.22, 2 + z]} scale={[20.6, 0.72, 0.08]} color="#eefcff" opacity={0.58} />
      ))}
    </group>
  );
}

function WestAuditoriumPrecisionDetails() {
  const ribXs = Array.from({ length: 11 }, (_, index) => -32.5 + index * 1.55);
  const seatRows = Array.from({ length: 7 }, (_, index) => index);

  return (
    <group>
      <DetailBox position={[-25, 8.72, 4]} scale={[17.2, 0.38, 15.2]} color="#eefcff" opacity={0.52} />
      <DetailBox position={[-25, 9.12, 4]} scale={[14.8, 0.18, 11.5]} color="#6ee7f9" opacity={0.18} emissive="#38bdf8" />
      <DetailBox position={[-25, 8.2, 4]} scale={[17.0, 0.22, 15.0]} color="#dbe7ec" opacity={0.46} rotation={[0, 0, -0.035]} />
      {ribXs.map((x, index) => (
        <DetailBox
          key={`west-hall-front-rib-${index}`}
          position={[x, 4.35, 11.28]}
          scale={[0.1, 7.7, 0.24]}
          color={index % 2 === 0 ? "#edfaff" : "#9dc4d3"}
          opacity={index % 2 === 0 ? 0.78 : 0.58}
        />
      ))}
      {ribXs.slice(1, -1).map((x, index) => (
        <DetailBox key={`west-hall-back-rib-${index}`} position={[x, 4.35, -3.28]} scale={[0.1, 7.35, 0.2]} color="#bed7e2" opacity={0.5} />
      ))}
      {[2.35, 4.85, 7.35].map((y) => (
        <group key={`west-hall-window-band-${y}`}>
          <DetailBox position={[-25, y, 11.46]} scale={[15.7, 0.78, 0.08]} color="#bceeff" opacity={0.34} emissive="#38bdf8" />
          <DetailBox position={[-25, y + 0.54, 11.58]} scale={[15.9, 0.08, 0.12]} color="#eefcff" opacity={0.72} />
        </group>
      ))}
      <group position={[-25, 1.65, 12.0]}>
        <DetailBox position={[0, 0, 0]} scale={[7.4, 3.1, 0.34]} color="#f5fdff" opacity={0.58} emissive="#38bdf8" />
        <DetailBox position={[0, 1.65, 1.36]} scale={[9.2, 0.26, 2.9]} color="#eefcff" opacity={0.75} />
        <DetailBox position={[0, -0.22, 0.36]} scale={[2.2, 2.3, 0.16]} color="#23465a" opacity={0.82} />
        <DetailBox position={[-2.2, -0.22, 0.36]} scale={[1.2, 2.3, 0.14]} color="#bceeff" opacity={0.42} />
        <DetailBox position={[2.2, -0.22, 0.36]} scale={[1.2, 2.3, 0.14]} color="#bceeff" opacity={0.42} />
        {[-2, -1, 0, 1, 2].map((step) => (
          <DetailBox key={`west-hall-step-${step}`} position={[0, -1.48 + step * 0.05, 2.34 + step * 0.42]} scale={[10.2 - step * 0.58, 0.12, 0.38]} color="#d8e8ed" opacity={0.95} />
        ))}
      </group>
      <DetailBox position={[-25, 1.65, -2.9]} scale={[10.8, 2.55, 0.32]} color="#3f5564" opacity={0.7} />
      <DetailBox position={[-25, 2.05, -2.62]} scale={[8.8, 1.3, 0.16]} color="#111827" opacity={0.82} />
      {seatRows.map((row) => (
        <group key={`auditorium-seat-row-${row}`} position={[-25, 1.1 + row * 0.18, 0.1 + row * 0.72]}>
          {Array.from({ length: 10 }, (_, col) => -6.4 + col * 1.42).map((x) => (
            <DetailBox key={`auditorium-seat-${row}-${x}`} position={[x + 25, 0, 0]} scale={[0.72, 0.22, 0.34]} color={row % 2 === 0 ? "#1e5f75" : "#255f81"} opacity={0.82} />
          ))}
        </group>
      ))}
      {[-32.9, -17.1].map((x) => (
        <group key={`west-side-exit-${x}`} position={[x, 1.4, 4.2]}>
          <DetailBox position={[0, 0, 0]} scale={[0.22, 2.3, 2.2]} color="#1f3a4a" opacity={0.82} />
          <DetailBox position={[0.08, 0.92, 0]} scale={[0.1, 0.22, 2.5]} color="#22c55e" opacity={0.75} emissive="#22c55e" />
        </group>
      ))}
      {[-31.5, -28.8, -26.1, -23.4, -20.7, -18.0].map((x, index) => (
        <group key={`west-hall-bollard-${index}`} position={[x, 0, 15.2]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.13, 1.1, 12]} />
            <meshStandardMaterial color="#5cc9e8" emissive="#0ea5e9" emissiveIntensity={0.28} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SiteDetails() {
  return (
    <group>
      {[-6, 0, 6].map((offset) => (
        <DetailBox key={`road-east-line-${offset}`} position={[46 + offset, 0.13, 18]} scale={[0.16, 0.04, 66]} color={offset === 0 ? "#facc15" : "#e2e8f0"} opacity={0.78} />
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <DetailBox key={`road-south-dash-${index}`} position={[-28 + index * 6.4, 0.16, 45]} scale={[3.1, 0.04, 0.16]} color="#e2e8f0" opacity={0.82} rotation={[0, -0.28, 0]} />
      ))}
      {Array.from({ length: 8 }, (_, index) => (
        <DetailBox key={`crosswalk-${index}`} position={[35 + index * 0.9, 0.18, 31]} scale={[0.45, 0.05, 4.8]} color="#f8fafc" opacity={0.82} rotation={[0, -0.28, 0]} />
      ))}
      {Array.from({ length: 18 }, (_, index) => {
        const angle = index * 0.34 + 0.8;
        return (
          <mesh key={`shore-${index}`} position={[-48 + Math.cos(angle) * 20, 0.05, -8 + Math.sin(angle) * 27]} scale={[1.8, 0.18, 0.9]} rotation={[0, angle, 0]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#61717a" roughness={0.8} />
          </mesh>
        );
      })}
      {Array.from({ length: 16 }, (_, index) => (
        <group key={`lamp-${index}`} position={[-20 + index * 4.8, 0, 25 + (index % 2) * 8]}>
          <mesh position={[0, 1.75, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 3.5, 10]} />
            <meshStandardMaterial color="#7dd3fc" metalness={0.25} roughness={0.3} />
          </mesh>
          <mesh position={[0, 3.62, 0]}>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#fef9c3" emissive="#facc15" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 24 }, (_, index) => (
        <mesh key={`shrub-${index}`} position={[-33 + (index % 8) * 4.8, 0.34, 28 + Math.floor(index / 8) * 4.2]} castShadow>
          <sphereGeometry args={[0.72, 10, 8]} />
          <meshStandardMaterial color={index % 5 === 0 ? "#86a13a" : "#1f7a52"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function FireAccessDetails() {
  const hydrants: Array<[number, number]> = [
    [15, 17],
    [41, 35],
    [-16, 20],
    [33, -8]
  ];

  return (
    <group>
      <DetailBox position={[18, 0.2, 19.5]} scale={[24, 0.06, 0.42]} color="#ef4444" opacity={0.78} />
      <DetailBox position={[35, 0.2, 5]} scale={[0.42, 0.06, 28]} color="#ef4444" opacity={0.78} />
      {hydrants.map(([x, z], index) => (
        <group key={`hydrant-${index}`} position={[x, 0, z]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.24, 0.95, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <sphereGeometry args={[0.26, 12, 10]} />
            <meshStandardMaterial color="#f87171" emissive="#ef4444" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
      {[
        [-14, 15, "EXIT"],
        [8, 18, "EXIT"],
        [-8, 36, "SAFE"]
      ].map(([x, z, label]) => (
        <Html key={`${x}-${z}`} position={[Number(x), 1.6, Number(z)]} center className="scene-label">
          {label}
        </Html>
      ))}
    </group>
  );
}

function ArchitecturalDetails() {
  return (
    <group>
      <FacadeGrid />
      <EntranceDetails />
      <InteriorDetails />
      <RoofAndMEPDetails />
      <AnnexDetails />
      <AtriumPrecisionDetails />
      <EastAnnexPrecisionDetails />
      <WestAuditoriumPrecisionDetails />
      <SiteDetails />
      <FireAccessDetails />
    </group>
  );
}

function SensorPoint({ sensor, editor }: { sensor: SensorData; editor: boolean }) {
  const selectedSensorId = useTwinStore((state) => state.selectedSensorId);
  const selectSensor = useTwinStore((state) => state.selectSensor);
  const patchSensorLocal = useTwinStore((state) => state.patchSensorLocal);
  const saveSensor = useTwinStore((state) => state.saveSensor);
  const dragging = useRef(false);
  const ref = useRef<THREE.Mesh>(null);
  const isSelected = selectedSensorId === sensor.id;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = sensor.status === "danger" ? 1 + Math.sin(clock.elapsedTime * 8) * 0.22 : 1 + Math.sin(clock.elapsedTime * 3) * 0.08;
    ref.current.scale.setScalar(isSelected ? 1.45 : pulse);
  });

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    selectSensor(sensor.id);
    if (!editor) return;
    dragging.current = true;
  }

  function onPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current || !editor) return;
    event.stopPropagation();
    patchSensorLocal(sensor.id, {
      position: {
        ...sensor.position,
        x: Number(event.point.x.toFixed(2)),
        z: Number(event.point.z.toFixed(2))
      }
    });
  }

  function onPointerUp(event: ThreeEvent<PointerEvent>) {
    if (!dragging.current) return;
    dragging.current = false;
    event.stopPropagation();
    void saveSensor(sensor.id);
  }

  return (
    <group position={vec3(sensor.position)}>
      <mesh ref={ref} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <sphereGeometry args={[0.38, 18, 18]} />
        <meshStandardMaterial color={sensorColors[sensor.status]} emissive={sensorColors[sensor.status]} emissiveIntensity={sensor.status === "danger" ? 1.4 : 0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.58, 0.035, 8, 28]} />
        <meshBasicMaterial color={sensorColors[sensor.status]} transparent opacity={0.7} />
      </mesh>
      {(isSelected || sensor.status !== "normal") && (
        <Html center position={[0, 0.82, 0]} className={`sensor-label sensor-label--${sensor.status}`}>
          <strong>{sensorTypeLabel[sensor.type]}</strong>
          <span>{sensor.name}</span>
          <small>
            {sensor.value}
            {sensor.unit}
          </small>
        </Html>
      )}
    </group>
  );
}

function FireMarker() {
  const fire = useTwinStore((state) => state.fire);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 8) * 0.16;
    ref.current.scale.set(pulse, pulse, pulse);
    ref.current.rotation.y += 0.025;
  });

  if (fire.status !== "active") return null;

  return (
    <group ref={ref} position={vec3(fire.origin)}>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[1.15, 2.5, 7]} />
        <meshStandardMaterial color="#fb7185" emissive="#ef4444" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.08, 8, 48]} />
        <meshBasicMaterial color="#fb3f5f" transparent opacity={0.85} />
      </mesh>
      <Html center position={[0, 2.2, 0]} className="fire-label">
        <strong>FIRE</strong>
        <span>{fire.areaName}</span>
      </Html>
    </group>
  );
}

function FireSpread() {
  const spread = useTwinStore((state) => state.spread);
  const colorOf = (state: string) => {
    if (state === "danger") return "#ef4444";
    if (state === "blocked") return "#7f1d1d";
    return "#f59e0b";
  };

  return (
    <>
      {spread.map((cell) => (
        <group key={cell.id} position={vec3(cell.center)}>
          <mesh scale={[2.35, 0.1, 2.05]} position={[0, -0.12, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={colorOf(cell.state)} transparent opacity={cell.state === "blocked" ? 0.72 : 0.44} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <sphereGeometry args={[1.08, 12, 8]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={cell.state === "danger" ? 0.18 : 0.1} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function EvacuationRoutes() {
  const routes = useTwinStore((state) => state.routes);
  const fire = useTwinStore((state) => state.fire);
  if (fire.status !== "active") return null;

  return (
    <>
      {routes.map((route) => {
        const color = route.type === "primary" ? "#22c55e" : "#38bdf8";
        return (
          <group key={route.id}>
            <Line
              points={route.points.map((point) => [point.x, point.y + 0.25, point.z])}
              color={color}
              lineWidth={route.type === "primary" ? 5 : 3}
              dashed={route.type === "backup"}
              dashScale={0.8}
              transparent
              opacity={route.type === "primary" ? 0.95 : 0.7}
            />
            {route.points.map((point, index) => (
              <mesh key={`${route.id}-${index}`} position={[point.x, point.y + 0.28, point.z]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.32, 0.75, 4]} />
                <meshBasicMaterial color={color} transparent opacity={0.9} />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

function PlacementGround({ editor }: { editor: boolean }) {
  const sensorPlacementType = useTwinStore((state) => state.sensorPlacementType);
  const addSensorAt = useTwinStore((state) => state.addSensorAt);
  const selectBuilding = useTwinStore((state) => state.selectBuilding);
  const selectSensor = useTwinStore((state) => state.selectSensor);
  const startFireAtPoint = useTwinStore((state) => state.startFireAtPoint);
  const sceneViewMode = useTwinStore((state) => state.sceneViewMode);
  const textures = useSurfaceTextures();

  function onClick(event: ThreeEvent<MouseEvent>) {
    if (sensorPlacementType) {
      void addSensorAt(event.point, 3);
      return;
    }
    if (sceneViewMode === "fire" && editor) {
      void startFireAtPoint({ x: event.point.x, y: 11.6, z: event.point.z }, 3);
      return;
    }
    selectBuilding(undefined);
    selectSensor(undefined);
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} onClick={onClick} receiveShadow>
      <planeGeometry args={[120, 100, 24, 24]} />
      <meshStandardMaterial color="#102b34" map={textures.asphalt} bumpMap={textures.asphalt} bumpScale={0.028} roughness={0.9} metalness={0.02} />
    </mesh>
  );
}

function SceneObjects({ editor }: { editor: boolean }) {
  const buildings = useTwinStore((state) => state.buildings);
  const sensors = useTwinStore((state) => state.sensors);
  const showSensors = useTwinStore((state) => state.showSensors);

  return (
    <>
      <ImportedModel />
      <PlacementGround editor={editor} />
      <FloorPlates />
      {buildings.map((building) => (
        <BuildingMesh key={building.id} building={building} editor={editor} />
      ))}
      <ArchitecturalDetails />
      <Trees />
      {showSensors ? sensors.map((sensor) => <SensorPoint key={sensor.id} sensor={sensor} editor={editor} />) : null}
      <FireSpread />
      <FireMarker />
      <EvacuationRoutes />
    </>
  );
}

export function SceneCanvas({ editor = false, className = "" }: { editor?: boolean; className?: string }) {
  const sceneViewMode = useTwinStore((state) => state.sceneViewMode);
  const fire = useTwinStore((state) => state.fire);

  const cameraPosition: [number, number, number] =
    sceneViewMode === "walk" ? [28, 12, 38] : sceneViewMode === "section" ? [0, 30, 38] : fire.status === "active" ? [28, 24, 34] : [36, 28, 44];

  return (
    <div className={`scene-shell ${className}`}>
      <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} className="scene-canvas">
        <PerspectiveCamera makeDefault position={cameraPosition} fov={48} />
        <OrbitControls enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} minDistance={16} maxDistance={90} target={[0, 6, 4]} />
        <Sky distance={450000} sunPosition={[80, 40, 80]} inclination={0.49} azimuth={0.28} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[24, 50, 20]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-25, 8, 16]} intensity={60} color="#22d3ee" />
        <pointLight position={[28, 10, -12]} intensity={55} color="#2dd4bf" />
        {fire.status === "active" ? <pointLight position={vec3(fire.origin)} intensity={180} color="#ef4444" /> : null}
        <gridHelper args={[120, 60, "#1f9bb4", "#143242"]} position={[0, 0.01, 0]} />
        <Suspense fallback={null}>
          <SceneObjects editor={editor} />
        </Suspense>
      </Canvas>
      <div className="scene-overlay">
        <span>{sceneViewMode === "overview" ? "俯视视图" : sceneViewMode === "walk" ? "漫游视图" : sceneViewMode === "section" ? "楼层剖切" : "消防视图"}</span>
        <span>{fire.status === "active" ? `火灾推演 ${fire.spreadStep}s` : "程序化模型 / GLB 自动导入"}</span>
      </div>
    </div>
  );
}
