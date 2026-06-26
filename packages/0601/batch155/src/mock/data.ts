import type { DashboardData, BusRoute, BusStatus } from '@/types'
import { calcOnTimeRate, sortTop5Delayed } from '@/lib/utils'

const ROUTE_NAMES = [
  { id: '1', name: '1路', dir: '火车站 → 科技园' },
  { id: '5', name: '5路', dir: '市中心 → 大学城' },
  { id: '10', name: '10路', dir: '东湖 → 西客站' },
  { id: '18', name: '18路', dir: '人民医院 → 工业区' },
  { id: '22', name: '22路', dir: '南门 → 北郊公园' },
  { id: '35', name: '35路', dir: '体育馆 → 会展中心' },
  { id: '42', name: '42路', dir: '高新区 → 老城区' },
  { id: '56', name: '56路', dir: '机场 → 火车东站' },
  { id: '63', name: '63路', dir: '万达广场 → 汽车北站' },
  { id: '77', name: '77路', dir: '滨河路 → 创业大道' },
  { id: '88', name: '88路', dir: '市政府 → 开发区' },
  { id: '99', name: '99路', dir: '文化宫 → 新区枢纽' },
  { id: '105', name: '105路', dir: '动物园 → 商业街' },
  { id: '118', name: '118路', dir: '软件园 → 高铁站' },
  { id: '126', name: '126路', dir: '湖滨路 → 科技大道' },
  { id: '203', name: '203路', dir: '环线 → 内环' },
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRoute(definition: { id: string; name: string; dir: string }): BusRoute {
  const roll = Math.random()
  let status: BusStatus
  let minutesAway: number
  let delayMinutes: number

  if (roll < 0.12) {
    status = 'out-of-service'
    minutesAway = -1
    delayMinutes = 0
  } else if (roll < 0.25) {
    status = 'arriving'
    minutesAway = rand(0, 2)
    delayMinutes = 0
  } else if (roll < 0.55) {
    status = 'delayed'
    minutesAway = rand(5, 25)
    delayMinutes = rand(3, 15)
  } else {
    status = 'on-time'
    minutesAway = rand(2, 20)
    delayMinutes = 0
  }

  const now = new Date()
  const eta = new Date(now.getTime() + minutesAway * 60000)

  return {
    routeId: definition.id,
    routeName: definition.name,
    direction: definition.dir,
    nextBusETA: eta.toISOString(),
    minutesAway,
    status,
    delayMinutes,
  }
}

export function generateMockData(): DashboardData {
  const count = rand(12, 16)
  const selected = ROUTE_NAMES.slice(0, count)
  const routes = selected.map(generateRoute)

  const activeRoutes = routes.filter(r => r.status !== 'out-of-service').length
  const delayedRoutes = routes.filter(r => r.status === 'delayed').length
  const outOfServiceRoutes = routes.filter(r => r.status === 'out-of-service').length

  const onTimeRoutes = routes.filter(r => r.status === 'on-time' || r.status === 'arriving').length
  const onTimeRate = calcOnTimeRate(activeRoutes, onTimeRoutes)

  const top5Delayed = sortTop5Delayed(
    routes.filter(r => r.status === 'delayed')
  ) as BusRoute[]

  return {
    timestamp: new Date().toISOString(),
    onTimeRate,
    totalRoutes: routes.length,
    activeRoutes,
    delayedRoutes,
    outOfServiceRoutes,
    routes,
    top5Delayed,
  }
}
