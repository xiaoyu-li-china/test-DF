import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Mountain from "./Mountain";
import SlopePath from "./SlopePath";
import SnowParticles from "./SnowParticles";
import type { SlopeData } from "@/utils/congestionColor";

interface SceneProps {
  slopes: SlopeData[];
  selectedSlopeId: string | null;
  onSlopeClick: (id: string | null) => void;
}

export default function Scene({ slopes, selectedSlopeId, onSlopeClick }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [40, 35, 40], fov: 50, near: 0.1, far: 500 }}
      gl={{ antialias: true, toneMapping: 3 }}
      style={{ background: "linear-gradient(180deg, #0c1e3a 0%, #1a3a5c 40%, #4a7a9b 80%, #8ab4cc 100%)" }}
      onClick={() => onSlopeClick(null)}
    >
      <fog attach="fog" args={["#4a7a9b", 50, 150]} />
      <ambientLight intensity={0.5} color="#c8d8e8" />
      <directionalLight
        position={[30, 40, 20]}
        intensity={1.2}
        color="#ffe8c0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <directionalLight position={[-20, 20, -10]} intensity={0.3} color="#a0c0e0" />
      <hemisphereLight args={["#b0d0f0", "#2a3a2a", 0.4]} />

      <Mountain />
      {slopes.map((slope) => (
        <SlopePath
          key={slope.id}
          id={slope.id}
          points={slope.points as number[][]}
          congestion={slope.congestion}
          isSelected={selectedSlopeId === slope.id}
          onClick={onSlopeClick}
        />
      ))}
      <SnowParticles />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={15}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.1}
        target={[0, 8, 8]}
      />
    </Canvas>
  );
}
