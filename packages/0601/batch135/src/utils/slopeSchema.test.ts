import { describe, it, expect } from "vitest";
import {
  validateSlopesData,
  validateSingleSlope,
  LiftInfoSchema,
  HistoryEntrySchema,
  Point3DSchema,
  SlopeDataSchema,
  SlopesDatasetSchema,
} from "./slopeSchema";
import slopesData from "@/data/slopes.json";

describe("slopeSchema validation", () => {
  const validLift = {
    name: "A1 缆车",
    type: "chairlift" as const,
    capacity: 4,
  };

  const validHistory = [
    { time: "08:00", congestion: 10 },
    { time: "09:00", congestion: 20 },
  ];

  const validPoints: [number, number, number][] = [
    [0, 0, 0],
    [10, 5, 10],
    [20, 0, 20],
  ];

  const validSlope = {
    id: "slope-1",
    name: "测试雪道",
    difficulty: "beginner" as const,
    congestion: 50,
    waitTime: 5,
    lift: validLift,
    history: validHistory,
    points: validPoints,
  };

  describe("LiftInfoSchema", () => {
    it("should validate valid lift info", () => {
      const result = LiftInfoSchema.safeParse(validLift);
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const invalid = { ...validLift, name: "" };
      const result = LiftInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid lift type", () => {
      const invalid = { ...validLift, type: "invalid" };
      const result = LiftInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject non-positive capacity", () => {
      const invalid = { ...validLift, capacity: 0 };
      const result = LiftInfoSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should accept all valid lift types", () => {
      expect(LiftInfoSchema.safeParse({ ...validLift, type: "chairlift" }).success).toBe(true);
      expect(LiftInfoSchema.safeParse({ ...validLift, type: "gondola" }).success).toBe(true);
      expect(LiftInfoSchema.safeParse({ ...validLift, type: "t-bar" }).success).toBe(true);
    });
  });

  describe("HistoryEntrySchema", () => {
    it("should validate valid history entry", () => {
      const result = HistoryEntrySchema.safeParse(validHistory[0]);
      expect(result.success).toBe(true);
    });

    it("should reject invalid time format", () => {
      const invalid = { time: "8:00", congestion: 10 };
      const result = HistoryEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject congestion out of range (negative)", () => {
      const invalid = { time: "08:00", congestion: -1 };
      const result = HistoryEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject congestion out of range (over 100)", () => {
      const invalid = { time: "08:00", congestion: 101 };
      const result = HistoryEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should accept time in HH:MM format", () => {
      expect(HistoryEntrySchema.safeParse({ time: "00:00", congestion: 50 }).success).toBe(true);
      expect(HistoryEntrySchema.safeParse({ time: "23:59", congestion: 50 }).success).toBe(true);
    });
  });

  describe("Point3DSchema", () => {
    it("should validate valid 3D point", () => {
      const result = Point3DSchema.safeParse(validPoints[0]);
      expect(result.success).toBe(true);
    });

    it("should reject point with fewer coordinates", () => {
      const invalid = [0, 0];
      const result = Point3DSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric coordinates", () => {
      const invalid = [0, "0", 0];
      const result = Point3DSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("SlopeDataSchema", () => {
    it("should validate valid slope data", () => {
      const result = SlopeDataSchema.safeParse(validSlope);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const { id: _, ...missingId } = validSlope;
      const result = SlopeDataSchema.safeParse(missingId);
      expect(result.success).toBe(false);
    });

    it("should reject empty id", () => {
      const invalid = { ...validSlope, id: "" };
      const result = SlopeDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalid = { ...validSlope, name: "" };
      const result = SlopeDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject invalid difficulty", () => {
      const invalid = { ...validSlope, difficulty: "expert" };
      const result = SlopeDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should accept all valid difficulty levels", () => {
      expect(SlopeDataSchema.safeParse({ ...validSlope, difficulty: "beginner" }).success).toBe(true);
      expect(SlopeDataSchema.safeParse({ ...validSlope, difficulty: "intermediate" }).success).toBe(true);
      expect(SlopeDataSchema.safeParse({ ...validSlope, difficulty: "advanced" }).success).toBe(true);
    });

    it("should reject congestion out of 0-100 range", () => {
      expect(SlopeDataSchema.safeParse({ ...validSlope, congestion: -1 }).success).toBe(false);
      expect(SlopeDataSchema.safeParse({ ...validSlope, congestion: 101 }).success).toBe(false);
    });

    it("should reject negative waitTime", () => {
      const invalid = { ...validSlope, waitTime: -1 };
      const result = SlopeDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject empty history array", () => {
      const invalid = { ...validSlope, history: [] };
      const result = SlopeDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject points with fewer than 3 points", () => {
      const invalid = { ...validSlope, points: [[0, 0, 0], [1, 1, 1]] };
      const result = SlopeDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("SlopesDatasetSchema", () => {
    it("should validate array of slopes", () => {
      const dataset = [validSlope, { ...validSlope, id: "slope-2" }];
      const result = SlopesDatasetSchema.safeParse(dataset);
      expect(result.success).toBe(true);
    });

    it("should reject empty array", () => {
      const result = SlopesDatasetSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it("should reject non-array input", () => {
      const result = SlopesDatasetSchema.safeParse(validSlope);
      expect(result.success).toBe(false);
    });
  });

  describe("validateSingleSlope function", () => {
    it("should return success and data for valid slope", () => {
      const result = validateSingleSlope(validSlope);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validSlope);
      expect(result.errors).toBeUndefined();
    });

    it("should return failure and errors for invalid slope", () => {
      const invalid = { ...validSlope, congestion: 150 };
      const result = validateSingleSlope(invalid);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain("congestion");
    });

    it("should include field path in error messages", () => {
      const invalid = { ...validSlope, lift: { ...validLift, type: "invalid" } };
      const result = validateSingleSlope(invalid);
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain("lift.type");
    });
  });

  describe("validateSlopesData function", () => {
    it("should return success for valid dataset", () => {
      const dataset = [validSlope, { ...validSlope, id: "slope-2" }];
      const result = validateSlopesData(dataset);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dataset);
    });

    it("should return errors for invalid dataset", () => {
      const dataset = [validSlope, { ...validSlope, id: "", congestion: 200 }];
      const result = validateSlopesData(dataset);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should handle completely invalid input", () => {
      const result = validateSlopesData("not an array");
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should handle null input", () => {
      const result = validateSlopesData(null);
      expect(result.success).toBe(false);
    });

    it("should handle undefined input", () => {
      const result = validateSlopesData(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe("real slopes.json data validation", () => {
    it("should validate the actual slopes.json file", () => {
      const result = validateSlopesData(slopesData);
      if (!result.success) {
        console.error("Validation errors:", result.errors);
      }
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("should have all slopes with unique IDs", () => {
      const result = validateSlopesData(slopesData);
      expect(result.success).toBe(true);
      const ids = result.data!.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have consistent history length across all slopes", () => {
      const result = validateSlopesData(slopesData);
      expect(result.success).toBe(true);
      const historyLengths = result.data!.map((s) => s.history.length);
      const firstLength = historyLengths[0];
      historyLengths.forEach((len) => {
        expect(len).toBe(firstLength);
      });
    });

    it("should have consistent time points in history", () => {
      const result = validateSlopesData(slopesData);
      expect(result.success).toBe(true);
      const timePoints = result.data![0].history.map((h) => h.time);
      result.data!.forEach((slope) => {
        const slopeTimes = slope.history.map((h) => h.time);
        expect(slopeTimes).toEqual(timePoints);
      });
    });
  });
});
