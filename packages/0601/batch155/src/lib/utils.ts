import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DashboardData } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const safeNum = (v: number, fallback: number = 0): number =>
  Number.isFinite(v) ? v : fallback

export function formatETA(isoStr: string): string {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function sanitizeData(data: DashboardData): DashboardData {
  return {
    ...data,
    onTimeRate: safeNum(data.onTimeRate, 0),
    totalRoutes: safeNum(data.totalRoutes, 0),
    activeRoutes: safeNum(data.activeRoutes, 0),
    delayedRoutes: safeNum(data.delayedRoutes, 0),
    outOfServiceRoutes: safeNum(data.outOfServiceRoutes, 0),
    routes: data.routes.map(r => ({
      ...r,
      minutesAway: safeNum(r.minutesAway, -1),
      delayMinutes: safeNum(r.delayMinutes, 0),
    })),
    top5Delayed: data.top5Delayed.map(r => ({
      ...r,
      minutesAway: safeNum(r.minutesAway, -1),
      delayMinutes: safeNum(r.delayMinutes, 0),
    })),
  }
}

export function calcOnTimeRate(activeRoutes: number, onTimeRoutes: number): number {
  if (activeRoutes <= 0) return 0
  const rawRate = (onTimeRoutes / activeRoutes) * 100
  return safeNum(
    Math.max(0, Math.min(100, Math.round(rawRate * 10) / 10)),
    0
  )
}

export function sortTop5Delayed(routes: Array<{ delayMinutes: number }>) {
  return [...routes]
    .filter((r): r is { delayMinutes: number } =>
      Number.isFinite(r.delayMinutes) && r.delayMinutes > 0
    )
    .sort((a, b) => safeNum(b.delayMinutes, 0) - safeNum(a.delayMinutes, 0))
    .slice(0, 5)
}
