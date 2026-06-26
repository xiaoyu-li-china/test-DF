import * as THREE from "three";
import type { SlopeData } from "./slopeSchema";

export type { SlopeData };

export function getCongestionColor(congestion: number): THREE.Color {
  const t = Math.max(0, Math.min(1, congestion / 100));
  const color = new THREE.Color();
  if (t < 0.5) {
    color.setHex(0x22c55e);
    color.lerp(new THREE.Color(0xeab308), t * 2);
  } else {
    color.setHex(0xeab308);
    color.lerp(new THREE.Color(0xef4444), (t - 0.5) * 2);
  }
  return color;
}

export function getCongestionLabel(congestion: number): string {
  if (congestion < 34) return "通畅";
  if (congestion < 67) return "较拥挤";
  return "拥挤";
}

export function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "初级";
    case "intermediate":
      return "中级";
    case "advanced":
      return "高级";
    default:
      return "未知";
  }
}
