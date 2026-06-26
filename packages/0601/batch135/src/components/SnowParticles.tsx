import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Particles() {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const particleData = useRef(
    Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        Math.random() * 25 + 5,
        (Math.random() - 0.5) * 80
      ),
      speed: Math.random() * 0.02 + 0.01,
      drift: (Math.random() - 0.5) * 0.005,
    }))
  );

  const dummy = useRef(new THREE.Object3D());

  useFrame(() => {
    if (!meshRef.current) return;
    const d = dummy.current;
    particleData.current.forEach((p, i) => {
      p.position.y -= p.speed;
      p.position.x += p.drift;
      if (p.position.y < 0) {
        p.position.y = 25 + Math.random() * 5;
        p.position.x = (Math.random() - 0.5) * 80;
        p.position.z = (Math.random() - 0.5) * 80;
      }
      d.position.copy(p.position);
      d.scale.setScalar(0.08 + Math.random() * 0.04);
      d.updateMatrix();
      meshRef.current!.setMatrixAt(i, d.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
    </instancedMesh>
  );
}
