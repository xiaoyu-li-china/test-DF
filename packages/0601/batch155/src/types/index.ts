export type BusStatus = 'on-time' | 'delayed' | 'arriving' | 'out-of-service'

export interface BusRoute {
  routeId: string
  routeName: string
  direction: string
  nextBusETA: string
  minutesAway: number
  status: BusStatus
  delayMinutes: number
}

export interface DashboardData {
  timestamp: string
  onTimeRate: number
  totalRoutes: number
  activeRoutes: number
  delayedRoutes: number
  outOfServiceRoutes: number
  routes: BusRoute[]
  top5Delayed: BusRoute[]
}
