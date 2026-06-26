import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  getCongestionColor,
  getCongestionLabel,
  getDifficultyLabel,
} from "./congestionColor";

describe("congestionColor utility functions", () => {
  describe("getCongestionColor", () => {
    it("should return green color for 0% congestion", () => {
      const color = getCongestionColor(0);
      expect(color).toBeInstanceOf(THREE.Color);
      expect(color.getHexString()).toBe("22c55e");
    });

    it("should return green color for low congestion (20%)", () => {
      const color = getCongestionColor(20);
      expect(color).toBeInstanceOf(THREE.Color);
      const hex = color.getHexString();
      expect(parseInt(hex, 16)).toBeGreaterThan(0x22c55e);
      expect(parseInt(hex, 16)).toBeLessThan(0xeab308);
    });

    it("should return yellow color for 50% congestion", () => {
      const color = getCongestionColor(50);
      expect(color.getHexString()).toBe("eab308");
    });

    it("should return red color for 100% congestion", () => {
      const color = getCongestionColor(100);
      expect(color.getHexString()).toBe("ef4444");
    });

    it("should return yellow-to-red gradient for high congestion (75%)", () => {
      const color = getCongestionColor(75);
      const hex = color.getHexString();
      const yellow = new THREE.Color(0xeab308);
      const red = new THREE.Color(0xef4444);
      expect(color.r).toBeGreaterThan(yellow.r);
      expect(color.g).toBeLessThan(yellow.g);
      expect(color.r).toBeLessThan(red.r);
      expect(color.g).toBeGreaterThan(red.g);
    });

    it("should clamp values below 0 to 0 (green)", () => {
      const color1 = getCongestionColor(-10);
      const color2 = getCongestionColor(0);
      expect(color1.getHexString()).toBe(color2.getHexString());
    });

    it("should clamp values above 100 to 100 (red)", () => {
      const color1 = getCongestionColor(150);
      const color2 = getCongestionColor(100);
      expect(color1.getHexString()).toBe(color2.getHexString());
    });

    it("should produce smooth color transitions", () => {
      const colors: string[] = [];
      for (let i = 0; i <= 100; i += 10) {
        colors.push(getCongestionColor(i).getHexString());
      }
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(5);
    });

    it("should transition green to yellow in first half", () => {
      const colorAt0 = getCongestionColor(0);
      const colorAt25 = getCongestionColor(25);
      const colorAt50 = getCongestionColor(50);
      expect(colorAt25.r).toBeGreaterThan(colorAt0.r);
      expect(colorAt25.g).toBeLessThan(colorAt0.g);
      expect(colorAt50.r).toBeGreaterThan(colorAt25.r);
      expect(colorAt50.g).toBeLessThan(colorAt25.g);
    });

    it("should transition yellow to red in second half", () => {
      const colorAt50 = getCongestionColor(50);
      const colorAt75 = getCongestionColor(75);
      const colorAt100 = getCongestionColor(100);
      expect(colorAt75.r).toBeGreaterThan(colorAt50.r);
      expect(colorAt75.g).toBeLessThan(colorAt50.g);
      expect(colorAt100.r).toBeGreaterThan(colorAt75.r);
      expect(colorAt100.g).toBeLessThan(colorAt75.g);
    });
  });

  describe("getCongestionLabel", () => {
    it("should return '通畅' for congestion < 34", () => {
      expect(getCongestionLabel(0)).toBe("通畅");
      expect(getCongestionLabel(15)).toBe("通畅");
      expect(getCongestionLabel(33)).toBe("通畅");
    });

    it("should return '较拥挤' for 34 <= congestion < 67", () => {
      expect(getCongestionLabel(34)).toBe("较拥挤");
      expect(getCongestionLabel(50)).toBe("较拥挤");
      expect(getCongestionLabel(66)).toBe("较拥挤");
    });

    it("should return '拥挤' for congestion >= 67", () => {
      expect(getCongestionLabel(67)).toBe("拥挤");
      expect(getCongestionLabel(80)).toBe("拥挤");
      expect(getCongestionLabel(100)).toBe("拥挤");
    });
  });

  describe("getDifficultyLabel", () => {
    it("should return '初级' for beginner difficulty", () => {
      expect(getDifficultyLabel("beginner")).toBe("初级");
    });

    it("should return '中级' for intermediate difficulty", () => {
      expect(getDifficultyLabel("intermediate")).toBe("中级");
    });

    it("should return '高级' for advanced difficulty", () => {
      expect(getDifficultyLabel("advanced")).toBe("高级");
    });

    it("should return '未知' for unknown difficulty", () => {
      expect(getDifficultyLabel("expert")).toBe("未知");
    });
  });
});
