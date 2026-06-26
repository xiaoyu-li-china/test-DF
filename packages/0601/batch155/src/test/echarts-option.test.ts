import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateMockData } from '@/mock/data'
import { sanitizeData } from '@/lib/utils'
import type { DashboardData } from '@/types'

describe('ECharts Mock Option - 数据层断言', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-02T08:30:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Gauge Chart Option - 准点率仪表盘', () => {
    const buildGaugeOption = (data: DashboardData) => ({
      series: [
        {
          type: 'gauge',
          min: 0,
          max: 100,
          detail: { value: data.onTimeRate },
          data: [{ value: data.onTimeRate }],
        },
      ],
    })

    it('仪表盘 value 必须是有效数字（0-100）', () => {
      for (let i = 0; i < 20; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)
        const option = buildGaugeOption(data)

        expect(Number.isFinite(option.series[0].detail.value)).toBe(true)
        expect(option.series[0].detail.value).toBeGreaterThanOrEqual(0)
        expect(option.series[0].detail.value).toBeLessThanOrEqual(100)
        expect(option.series[0].data[0].value).toBe(option.series[0].detail.value)
      }
    })

    it('跨日场景：activeRoutes = 0 时，仪表盘 value 必须为 0（不能是 NaN）', () => {
      const zeroActiveData: DashboardData = {
        timestamp: '2026-06-03T00:05:00Z',
        onTimeRate: NaN,
        totalRoutes: 5,
        activeRoutes: 0,
        delayedRoutes: 0,
        outOfServiceRoutes: 5,
        routes: [
          { routeId: '1', routeName: '1路', direction: 'A→B', nextBusETA: '', minutesAway: -1, status: 'out-of-service', delayMinutes: 0 },
        ],
        top5Delayed: [],
      }

      const data = sanitizeData(zeroActiveData)
      const option = buildGaugeOption(data)

      expect(option.series[0].detail.value).toBe(0)
      expect(option.series[0].detail.value).not.toBeNaN()
    })

    it('仪表盘 value 小数位数应为 1 位（显示用）', () => {
      const raw = generateMockData()
      const data = sanitizeData(raw)
      const option = buildGaugeOption(data)

      const decimalStr = option.series[0].detail.value.toFixed(1)
      expect(decimalStr).toMatch(/^\d+\.\d$/)
    })
  })

  describe('Bar Chart Option - 晚点 Top5', () => {
    const buildBarOption = (data: DashboardData) => ({
      xAxis: { type: 'value', max: Math.max(...data.top5Delayed.map(r => r.delayMinutes), 1) },
      yAxis: { type: 'category', data: data.top5Delayed.map(r => r.routeName) },
      series: [{ type: 'bar', data: data.top5Delayed.map(r => r.delayMinutes) }],
    })

    it('Bar 数据长度不能超过 5', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)
        const option = buildBarOption(data)

        expect(option.series[0].data.length).toBeLessThanOrEqual(5)
        expect(option.yAxis.data.length).toBeLessThanOrEqual(5)
      }
    })

    it('Bar 数据必须按降序排列', () => {
      const raw = generateMockData()
      const data = sanitizeData(raw)

      if (data.top5Delayed.length >= 2) {
        const option = buildBarOption(data)
        const barData = option.series[0].data as number[]

        for (let j = 1; j < barData.length; j++) {
          expect(barData[j - 1]).toBeGreaterThanOrEqual(barData[j])
        }
      }
    })

    it('Bar 数据必须是正整数（不能是 NaN、负数）', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)
        const option = buildBarOption(data)

        option.series[0].data.forEach((val: number) => {
          expect(Number.isFinite(val)).toBe(true)
          expect(val).toBeGreaterThanOrEqual(0)
        })
      }
    })

    it('无晚点时 yAxis 和 series 应为空数组（不报错）', () => {
      const noDelayData: DashboardData = {
        timestamp: '2026-06-02T08:30:00Z',
        onTimeRate: 100,
        totalRoutes: 5,
        activeRoutes: 5,
        delayedRoutes: 0,
        outOfServiceRoutes: 0,
        routes: [],
        top5Delayed: [],
      }

      const option = buildBarOption(noDelayData)
      expect(option.yAxis.data).toEqual([])
      expect(option.series[0].data).toEqual([])
      expect(() => {
        JSON.stringify(option)
      }).not.toThrow()
    })

    it('xAxis max 必须是正整数（不能是 NaN）', () => {
      const raw = generateMockData()
      const data = sanitizeData(raw)
      const option = buildBarOption(data)

      expect(Number.isFinite(option.xAxis.max)).toBe(true)
      expect(option.xAxis.max).toBeGreaterThan(0)
    })
  })

  describe('Arrival Table Data - 到站预测表', () => {
    it('每条线路的 minutesAway 必须是有效数字（-1 表示停运，>=0 表示正常）', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)

        data.routes.forEach(route => {
          expect(Number.isFinite(route.minutesAway)).toBe(true)
          if (route.status === 'out-of-service') {
            expect(route.minutesAway).toBe(-1)
          } else {
            expect(route.minutesAway).toBeGreaterThanOrEqual(0)
          }
        })
      }
    })

    it('delayMinutes 必须 >= 0（不能是 NaN、负数）', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)

        data.routes.forEach(route => {
          expect(Number.isFinite(route.delayMinutes)).toBe(true)
          expect(route.delayMinutes).toBeGreaterThanOrEqual(0)
        })
      }
    })

    it('nextBusETA 必须是可解析的 ISO 字符串', () => {
      const raw = generateMockData()
      const data = sanitizeData(raw)

      data.routes.forEach(route => {
        if (route.status !== 'out-of-service') {
          const parsed = new Date(route.nextBusETA)
          expect(Number.isNaN(parsed.getTime())).toBe(false)
        }
      })
    })
  })

  describe('Stats Cards Data - 统计卡片', () => {
    it('各统计字段必须是有效整数', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)

        expect(Number.isFinite(data.activeRoutes)).toBe(true)
        expect(Number.isFinite(data.delayedRoutes)).toBe(true)
        expect(Number.isFinite(data.outOfServiceRoutes)).toBe(true)
        expect(Number.isFinite(data.totalRoutes)).toBe(true)

        expect(data.activeRoutes).toBeGreaterThanOrEqual(0)
        expect(data.delayedRoutes).toBeGreaterThanOrEqual(0)
        expect(data.outOfServiceRoutes).toBeGreaterThanOrEqual(0)
        expect(data.totalRoutes).toBeGreaterThanOrEqual(0)
      }
    })

    it('activeRoutes + outOfServiceRoutes 必须等于 totalRoutes', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)

        expect(data.activeRoutes + data.outOfServiceRoutes).toBe(data.totalRoutes)
      }
    })

    it('delayedRoutes 不能超过 activeRoutes', () => {
      for (let i = 0; i < 10; i++) {
        const raw = generateMockData()
        const data = sanitizeData(raw)

        expect(data.delayedRoutes).toBeLessThanOrEqual(data.activeRoutes)
      }
    })
  })
})
