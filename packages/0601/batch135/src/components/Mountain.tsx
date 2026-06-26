import { useRef, useMemo } from "react";
import * as THREE from "three";

function noise2D(x: number, z: number): number {
  const sin1 = Math.sin(x * 0.12 + z * 0.08) * 0.5;
  const sin2 = Math.sin(x * 0.06 - z * 0.14) * 0.3;
  const sin3 = Math.sin(x * 0.22 + z * 0.18) * 0.15;
  const sin4 = Math.cos(x * 0.09 + z * 0.25) * 0.2;
  return sin1 + sin2 + sin3 + sin4;
}

function getHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  const peak = Math.max(0, 30 - dist * 0.4);
  const n = noise2D(x, z);
  const ridge = Math.max(0, 20 - dist * 0.35) * Math.sin(dist * 0.15) * 0.4;
  return Math.max(0, peak + n * 6 + ridge * 3 + 1);
}

export default function Mountain() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const size = 80;
    const segments = 120;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getHeight(x, z);
      pos.setY(i, y);

      const h = y / 32;
      const snow = new THREE.Color(0.95, 0.97, 1.0);
      const ice = new THREE.Color(0.7, 0.82, 0.92);
      const rock = new THREE.Color(0.45, 0.5, 0.55);

      let c: THREE.Color;
      if (h > 0.6) {
        c = ice.clone().lerp(snow, (h - 0.6) / 0.4);
      } else if (h > 0.25) {
        c = rock.clone().lerp(ice, (h - 0.25) / 0.35);
      } else {
        c = rock.clone().lerp(new THREE.Color(0.3, 0.38, 0.32), h / 0.25);
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.85}
        metalness={0.05}
        flatShading={false}
      />
    </mesh>
  );
}
