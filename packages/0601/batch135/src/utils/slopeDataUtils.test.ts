import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCongestionAtTime,
  getSlopesAtTime,
  sortSlopesByCongestion,
  getSlopeById,
  getAvgCongestion,
  getPeakCongestionTime,
  getCongestionTrend,
  simulateCongestionUpdate,
  getTimeLabels,
  getSlopesByDifficulty,
  getDifficultyStats,
} from "./slopeDataUtils";
import type { SlopeData } from "./slopeSchema";

describe("slopeDataUtils", () => {
  const createMockSlope = (
    id: string,
    history: { time: string; congestion: number }[],
    difficulty: "beginner" | "intermediate" | "advanced" = "intermediate"
  ): SlopeData => ({
    id,
    name: `Slope ${id}`,
    difficulty,
    congestion: history[history.length - 1].congestion,
    waitTime: 5,
    lift: { name: "Test Lift", type: "chairlift", capacity: 4 },
    history,
    points: [
      [0, 0, 0],
      [10, 5, 10],
      [20, 0, 20],
    ],
  });

  const mockHistory = [
    { time: "08:00", congestion: 10 },
    { time: "09:00", congestion: 30 },
    { time: "10:00", congestion: 50 },
    { time: "11:00", congestion: 70 },
    { time: "12:00", congestion: 60 },
  ];

  const mockSlopes: SlopeData[] = [
    createMockSlope("slope-1", mockHistory, "beginner"),
    createMockSlope("slope-2", [
      { time: "08:00", congestion: 20 },
      { time: "09:00", congestion: 40 },
      { time: "10:00", congestion: 60 },
      { time: "11:00", congestion: 80 },
      { time: "12:00", congestion: 70 },
    ], "intermediate"),
    createMockSlope("slope-3", [
      { time: "08:00", congestion: 30 },
      { time: "09:00", congestion: 50 },
      { time: "10:00", congestion: 70 },
      { time: "11:00", congestion: 90 },
      { time: "12:00", congestion: 85 },
    ], "advanced"),
  ];

  describe("getCongestionAtTime", () => {
    it("should return congestion at valid time index", () => {
      expect(getCongestionAtTime(mockSlopes[0], 0)).toBe(10);
      expect(getCongestionAtTime(mockSlopes[0], 2)).toBe(50);
      expect(getCongestionAtTime(mockSlopes[0], 4)).toBe(60);
    });

    it("should return fallback congestion for invalid time index", () => {
      const slope = mockSlopes[0];
      expect(getCongestionAtTime(slope, -1)).toBe(slope.congestion);
      expect(getCongestionAtTime(slope, 100)).toBe(slope.congestion);
    });
  });

  describe("getSlopesAtTime", () => {
    it("should return slopes with congestion at given time", () => {
      const result = getSlopesAtTime(mockSlopes, 2);
      expect(result.length).toBe(3);
      expect(result[0].congestion).toBe(50);
      expect(result[1].congestion).toBe(60);
      expect(result[2].congestion).toBe(70);
    });

    it("should preserve all other slope properties", () => {
      const result = getSlopesAtTime(mockSlopes, 2);
      expect(result[0].id).toBe(mockSlopes[0].id);
      expect(result[0].name).toBe(mockSlopes[0].name);
      expect(result[0].history).toEqual(mockSlopes[0].history);
    });
  });

  describe("sortSlopesByCongestion", () => {
    it("should sort slopes by congestion descending by default", () => {
      const result = sortSlopesByCongestion(mockSlopes, 2);
      expect(result[0].id).toBe("slope-3");
      expect(result[1].id).toBe("slope-2");
      expect(result[2].id).toBe("slope-1");
    });

    it("should sort slopes by congestion ascending when specified", () => {
      const result = sortSlopesByCongestion(mockSlopes, 2, true);
      expect(result[0].id).toBe("slope-1");
      expect(result[1].id).toBe("slope-2");
      expect(result[2].id).toBe("slope-3");
    });

    it("should not mutate original array", () => {
      const originalOrder = mockSlopes.map((s) => s.id);
      sortSlopesByCongestion(mockSlopes, 2);
      expect(mockSlopes.map((s) => s.id)).toEqual(originalOrder);
    });
  });

  describe("getSlopeById", () => {
    it("should return slope with matching id", () => {
      const result = getSlopeById(mockSlopes, "slope-2");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("slope-2");
    });

    it("should return null for null id", () => {
      expect(getSlopeById(mockSlopes, null)).toBeNull();
    });

    it("should return null for non-existent id", () => {
      expect(getSlopeById(mockSlopes, "non-existent")).toBeNull();
    });

    it("should return null for empty slopes array", () => {
      expect(getSlopeById([], "slope-1")).toBeNull();
    });
  });

  describe("getAvgCongestion", () => {
    it("should calculate average congestion", () => {
      const result = getAvgCongestion(mockSlopes, 2);
      expect(result).toBe(60);
    });

    it("should return 0 for empty array", () => {
      expect(getAvgCongestion([], 0)).toBe(0);
    });
  });

  describe("getPeakCongestionTime", () => {
    it("should find time with highest congestion", () => {
      const result = getPeakCongestionTime(mockSlopes[0]);
      expect(result.time).toBe("11:00");
      expect(result.congestion).toBe(70);
    });

    it("should handle empty history gracefully", () => {
      const slope = createMockSlope("test", mockHistory);
      slope.history = [];
      const result = getPeakCongestionTime(slope);
      expect(result.congestion).toBe(slope.congestion);
    });
  });

  describe("getCongestionTrend", () => {
    it("should detect rising trend", () => {
      expect(getCongestionTrend(mockSlopes[0], 3)).toBe("rising");
    });

    it("should detect falling trend", () => {
      expect(getCongestionTrend(mockSlopes[0], 4)).toBe("falling");
    });

    it("should detect stable trend", () => {
      const slope = createMockSlope("test", [
        { time: "08:00", congestion: 50 },
        { time: "09:00", congestion: 52 },
      ]);
      expect(getCongestionTrend(slope, 1)).toBe("stable");
    });

    it("should return stable for boundary indices", () => {
      expect(getCongestionTrend(mockSlopes[0], 0)).toBe("stable");
      expect(getCongestionTrend(mockSlopes[0], -1)).toBe("stable");
      expect(getCongestionTrend(mockSlopes[0], 100)).toBe("stable");
    });
  });

  describe("simulateCongestionUpdate", () => {
    beforeEach(() => {
      vi.spyOn(global.Math, "random").mockReturnValue(0.5);
    });

    it("should update history congestion values within valid range", () => {
      const result = simulateCongestionUpdate(mockSlopes);
      result.forEach((slope) => {
        slope.history.forEach((entry) => {
          expect(entry.congestion).toBeGreaterThanOrEqual(0);
          expect(entry.congestion).toBeLessThanOrEqual(100);
        });
      });
    });

    it("should not mutate original data", () => {
      const originalHistory = JSON.stringify(mockSlopes[0].history);
      simulateCongestionUpdate(mockSlopes);
      expect(JSON.stringify(mockSlopes[0].history)).toBe(originalHistory);
    });

    it("should preserve slope structure", () => {
      const result = simulateCongestionUpdate(mockSlopes);
      expect(result[0].id).toBe(mockSlopes[0].id);
      expect(result[0].name).toBe(mockSlopes[0].name);
      expect(result[0].history.length).toBe(mockSlopes[0].history.length);
    });
  });

  describe("getTimeLabels", () => {
    it("should extract time labels from first slope", () => {
      const result = getTimeLabels(mockSlopes);
      expect(result).toEqual(["08:00", "09:00", "10:00", "11:00", "12:00"]);
    });

    it("should return empty array for no slopes", () => {
      expect(getTimeLabels([])).toEqual([]);
    });

    it("should return empty array for slope with empty history", () => {
      const slope = createMockSlope("test", mockHistory);
      slope.history = [];
      expect(getTimeLabels([slope])).toEqual([]);
    });
  });

  describe("getSlopesByDifficulty", () => {
    it("should filter beginner slopes", () => {
      const result = getSlopesByDifficulty(mockSlopes, "beginner");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("slope-1");
    });

    it("should filter intermediate slopes", () => {
      const result = getSlopesByDifficulty(mockSlopes, "intermediate");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("slope-2");
    });

    it("should filter advanced slopes", () => {
      const result = getSlopesByDifficulty(mockSlopes, "advanced");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("slope-3");
    });

    it("should return empty array when no slopes match difficulty", () => {
      const result = getSlopesByDifficulty([mockSlopes[0]], "advanced");
      expect(result).toEqual([]);
    });
  });

  describe("getDifficultyStats", () => {
    it("should return stats for all difficulty levels", () => {
      const result = getDifficultyStats(mockSlopes, 2);
      expect(result.beginner.count).toBe(1);
      expect(result.intermediate.count).toBe(1);
      expect(result.advanced.count).toBe(1);
    });

    it("should calculate average congestion per difficulty", () => {
      const result = getDifficultyStats(mockSlopes, 2);
      expect(result.beginner.avgCongestion).toBe(50);
      expect(result.intermediate.avgCongestion).toBe(60);
      expect(result.advanced.avgCongestion).toBe(70);
    });

    it("should handle zero counts for missing difficulties", () => {
      const onlyBeginners = [mockSlopes[0]];
      const result = getDifficultyStats(onlyBeginners, 0);
      expect(result.beginner.count).toBe(1);
      expect(result.intermediate.count).toBe(0);
      expect(result.advanced.count).toBe(0);
    });
  });

  describe("integration tests", () => {
    it("should work together: getSlopeById -> getPeakCongestionTime", () => {
      const slope = getSlopeById(mockSlopes, "slope-3");
      expect(slope).not.toBeNull();
      const peak = getPeakCongestionTime(slope!);
      expect(peak.time).toBe("11:00");
      expect(peak.congestion).toBe(90);
    });

    it("should work together: sortSlopesByCongestion -> getSlopesAtTime", () => {
      const sorted = sortSlopesByCongestion(mockSlopes, 2);
      const withCongestion = getSlopesAtTime(sorted, 2);
      expect(withCongestion[0].congestion).toBe(70);
      expect(withCongestion[1].congestion).toBe(60);
      expect(withCongestion[2].congestion).toBe(50);
    });

    it("should work together: getTimeLabels -> getSlopesAtTime", () => {
      const times = getTimeLabels(mockSlopes);
      expect(times.length).toBe(5);
      const lastIndex = times.length - 1;
      const slopesAtEnd = getSlopesAtTime(mockSlopes, lastIndex);
      expect(slopesAtEnd[0].congestion).toBe(60);
    });

    it("should validate time index bounds for all time-based functions", () => {
      const times = getTimeLabels(mockSlopes);
      const firstIndex = 0;
      const lastIndex = times.length - 1;

      mockSlopes.forEach((slope) => {
        expect(() => getCongestionAtTime(slope, firstIndex)).not.toThrow();
        expect(() => getCongestionAtTime(slope, lastIndex)).not.toThrow();
        expect(() => getCongestionTrend(slope, firstIndex)).not.toThrow();
        expect(() => getCongestionTrend(slope, lastIndex)).not.toThrow();
      });
    });
  });
});
