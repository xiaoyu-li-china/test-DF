import { useRef, useMemo } from "react";
import * as THREE from "three";
import { getCongestionColor } from "@/utils/congestionColor";

interface SlopePathProps {
  id: string;
  points: number[][];
  congestion: number;
  isSelected: boolean;
  onClick: (id: string) => void;
}

function getSlopeY(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  const peak = Math.max(0, 30 - dist * 0.4);
  const n = Math.sin(x * 0.12 + z * 0.08) * 0.5
    + Math.sin(x * 0.06 - z * 0.14) * 0.3
    + Math.sin(x * 0.22 + z * 0.18) * 0.15
    + Math.cos(x * 0.09 + z * 0.25) * 0.2;
  const ridge = Math.max(0, 20 - dist * 0.35) * Math.sin(dist * 0.15) * 0.4;
  return Math.max(0, peak + n * 6 + ridge * 3 + 1);
}

export default function SlopePath({ id, points, congestion, isSelected, onClick }: SlopePathProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { curve, tubeGeo, color } = useMemo(() => {
    const adjusted = points.map((p) => {
      const x = p[0] ?? 0;
      const z = p[2] ?? 0;
      const y = getSlopeY(x, z) + (isSelected ? 0.5 : 0.25);
      return new THREE.Vector3(x, y, z);
    });

    const curve = new THREE.CatmullRomCurve3(adjusted, false, "catmullrom", 0.5);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, isSelected ? 1.6 : 1.2, 12, false);
    const color = getCongestionColor(congestion);

    return { curve, tubeGeo, color };
  }, [points, congestion, isSelected]);

  const emissiveColor = useMemo(() => {
    const t = congestion / 100;
    return new THREE.Color(color).multiplyScalar(isSelected ? 0.5 + t * 0.5 : 0.3 + t * 0.4);
  }, [color, congestion, isSelected]);

  return (
    <mesh
      ref={meshRef}
      geometry={tubeGeo}
      onClick={(e) => {
        e.stopPropagation();
        onClick(id);
      }}
    >
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={isSelected ? 1.2 + (congestion / 100) * 0.5 : 0.6 + (congestion / 100) * 0.8}
        roughness={0.3}
        metalness={0.1}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}
