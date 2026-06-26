import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatETA, safeNum, calcOnTimeRate, sortTop5Delayed, sanitizeData } from '@/lib/utils'
import type { DashboardData } from '@/types'

describe('Data Layer Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-02T08:30:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('1. 到站时间解析 - formatETA', () => {
    it('正常 ISO 时间应正确解析为 HH:MM 格式', () => {
      const result = formatETA('2026-06-02T09:15:30')
      expect(result).toBe('09:15')
    })

    it('跨日次日时间应正确解析', () => {
      const result = formatETA('2026-06-03T00:05:00')
      expect(result).toBe('00:05')
    })

    it('凌晨时间应补零显示', () => {
      const result = formatETA('2026-06-02T05:03:00')
      expect(result).toBe('05:03')
    })

    it('午夜 23:59 应正确显示', () => {
      const result = formatETA('2026-06-02T23:59:59')
      expect(result).toBe('23:59')
    })

    it('无效时间字符串应降级处理（不抛错）', () => {
      expect(() => formatETA('invalid-date')).not.toThrow()
    })
  })

  describe('2. 准点率计算 - calcOnTimeRate', () => {
    it('正常线路应正确计算百分比', () => {
      expect(calcOnTimeRate(10, 8)).toBe(80.0)
      expect(calcOnTimeRate(10, 5)).toBe(50.0)
      expect(calcOnTimeRate(100, 95)).toBe(95.0)
    })

    it('结果应保留 1 位小数', () => {
      expect(calcOnTimeRate(3, 2)).toBe(66.7)
    })

    it('全准时应返回 100.0', () => {
      expect(calcOnTimeRate(10, 10)).toBe(100.0)
    })

    it('全晚点应返回 0.0', () => {
      expect(calcOnTimeRate(10, 0)).toBe(0.0)
    })

    it('跨日 0 分母（全部停运）应返回 0，不出现 NaN', () => {
      expect(calcOnTimeRate(0, 0)).toBe(0)
      expect(calcOnTimeRate(-1, 0)).toBe(0)
    })

    it('NaN 输入应降级为 0', () => {
      expect(calcOnTimeRate(NaN as unknown as number, 5)).toBe(0)
      expect(calcOnTimeRate(10, NaN as unknown as number)).toBe(0)
    })

    it('超出 0-100 范围的值应被裁剪', () => {
      expect(calcOnTimeRate(10, 15)).toBe(100.0)
    })
  })

  describe('3. Top5 排序 - sortTop5Delayed', () => {
    it('应按晚点时长降序排列', () => {
      const routes = [
        { delayMinutes: 5 },
        { delayMinutes: 15 },
        { delayMinutes: 10 },
      ]
      const result = sortTop5Delayed(routes)
      expect(result).toHaveLength(3)
      expect(result[0].delayMinutes).toBe(15)
      expect(result[1].delayMinutes).toBe(10)
      expect(result[2].delayMinutes).toBe(5)
    })

    it('应只返回晚点（delayMinutes > 0）的线路', () => {
      const routes = [
        { delayMinutes: 10 },
        { delayMinutes: 0 },
        { delayMinutes: -1 },
        { delayMinutes: 5 },
      ]
      const result = sortTop5Delayed(routes)
      expect(result).toHaveLength(2)
      expect(result.every(r => r.delayMinutes > 0)).toBe(true)
    })

    it('超过 5 条时只取 Top5', () => {
      const routes = Array.from({ length: 10 }, (_, i) => ({
        delayMinutes: i + 1,
      }))
      const result = sortTop5Delayed(routes)
      expect(result).toHaveLength(5)
      expect(result[0].delayMinutes).toBe(10)
      expect(result[4].delayMinutes).toBe(6)
    })

    it('空数组应返回空数组', () => {
      expect(sortTop5Delayed([])).toEqual([])
    })

    it('无晚点线路应返回空数组', () => {
      const routes = [
        { delayMinutes: 0 },
        { delayMinutes: 0 },
      ]
      expect(sortTop5Delayed(routes)).toEqual([])
    })

    it('NaN 晚点值应被过滤掉', () => {
      const routes = [
        { delayMinutes: 10 },
        { delayMinutes: NaN },
        { delayMinutes: 5 },
      ]
      const result = sortTop5Delayed(routes)
      expect(result).toHaveLength(2)
      expect(result.every(r => Number.isFinite(r.delayMinutes))).toBe(true)
    })
  })

  describe('4. API 失败降级 - sanitizeData', () => {
    const createMockData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
      timestamp: '2026-06-02T08:30:00Z',
      onTimeRate: 85.5,
      totalRoutes: 16,
      activeRoutes: 14,
      delayedRoutes: 3,
      outOfServiceRoutes: 2,
      routes: [
        {
          routeId: '1',
          routeName: '1路',
          direction: 'A→B',
          nextBusETA: '2026-06-02T09:00:00Z',
          minutesAway: 30,
          status: 'on-time',
          delayMinutes: 0,
        },
      ],
      top5Delayed: [
        {
          routeId: '5',
          routeName: '5路',
          direction: 'C→D',
          nextBusETA: '2026-06-02T09:15:00Z',
          minutesAway: 45,
          status: 'delayed',
          delayMinutes: 10,
        },
      ],
      ...overrides,
    })

    it('正常数据应原样返回', () => {
      const data = createMockData()
      const result = sanitizeData(data)
      expect(result.onTimeRate).toBe(85.5)
      expect(result.activeRoutes).toBe(14)
      expect(result.routes[0].minutesAway).toBe(30)
    })

    it('onTimeRate 为 NaN 应降级为 0', () => {
      const data = createMockData({ onTimeRate: NaN })
      const result = sanitizeData(data)
      expect(result.onTimeRate).toBe(0)
      expect(Number.isFinite(result.onTimeRate)).toBe(true)
    })

    it('onTimeRate 为 Infinity 应降级为 0', () => {
      const data = createMockData({ onTimeRate: Infinity })
      const result = sanitizeData(data)
      expect(result.onTimeRate).toBe(0)
    })

    it('所有统计字段 NaN 都应被清理', () => {
      const data = createMockData({
        totalRoutes: NaN,
        activeRoutes: NaN,
        delayedRoutes: NaN,
        outOfServiceRoutes: NaN,
      })
      const result = sanitizeData(data)
      expect(result.totalRoutes).toBe(0)
      expect(result.activeRoutes).toBe(0)
      expect(result.delayedRoutes).toBe(0)
      expect(result.outOfServiceRoutes).toBe(0)
    })

    it('routes 中的 NaN minutesAway 应降级为 -1', () => {
      const data = createMockData({
        routes: [
          {
            routeId: '1',
            routeName: '1路',
            direction: 'A→B',
            nextBusETA: '2026-06-02T09:00:00Z',
            minutesAway: NaN,
            status: 'on-time' as const,
            delayMinutes: 0,
          },
        ],
      })
      const result = sanitizeData(data)
      expect(result.routes[0].minutesAway).toBe(-1)
    })

    it('routes 中的 NaN delayMinutes 应降级为 0', () => {
      const data = createMockData({
        routes: [
          {
            routeId: '1',
            routeName: '1路',
            direction: 'A→B',
            nextBusETA: '2026-06-02T09:00:00Z',
            minutesAway: 10,
            status: 'delayed' as const,
            delayMinutes: NaN,
          },
        ],
      })
      const result = sanitizeData(data)
      expect(result.routes[0].delayMinutes).toBe(0)
    })

    it('top5Delayed 中的 NaN 也应被清理', () => {
      const data = createMockData({
        top5Delayed: [
          {
            routeId: '5',
            routeName: '5路',
            direction: 'C→D',
            nextBusETA: '2026-06-02T09:15:00Z',
            minutesAway: NaN,
            status: 'delayed' as const,
            delayMinutes: NaN,
          },
        ],
      })
      const result = sanitizeData(data)
      expect(result.top5Delayed[0].minutesAway).toBe(-1)
      expect(result.top5Delayed[0].delayMinutes).toBe(0)
    })
  })

  describe('5. 基础工具函数 - safeNum', () => {
    it('正常数字应原样返回', () => {
      expect(safeNum(42)).toBe(42)
      expect(safeNum(0)).toBe(0)
      expect(safeNum(-10)).toBe(-10)
      expect(safeNum(99.9)).toBe(99.9)
    })

    it('NaN 应返回 fallback（默认 0）', () => {
      expect(safeNum(NaN)).toBe(0)
      expect(safeNum(NaN, -1)).toBe(-1)
    })

    it('Infinity 应返回 fallback', () => {
      expect(safeNum(Infinity)).toBe(0)
      expect(safeNum(-Infinity)).toBe(0)
    })

    it('0/0 的结果（NaN）应被正确处理', () => {
      expect(safeNum(0 / 0)).toBe(0)
    })
  })
})
