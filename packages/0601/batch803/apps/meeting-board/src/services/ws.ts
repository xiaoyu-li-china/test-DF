import type { Room, Booking, WSMessage } from '../types'

const now = Date.now()

const MOCK_ROOMS: Room[] = [
  { id: '1', name: '201', floor: 2, capacity: 6, status: 'idle' },
  { id: '2', name: '202', floor: 2, capacity: 8, status: 'occupied', meeting: '设计评审', endTime: '10:30', occupiedAt: now - 20 * 60 * 1000 },
  { id: '3', name: '203', floor: 2, capacity: 4, status: 'occupied', meeting: '面试', endTime: '10:15', occupiedAt: now - 5 * 60 * 1000 },
  { id: '4', name: '204', floor: 2, capacity: 10, status: 'idle' },
  { id: '5', name: '205', floor: 2, capacity: 6, status: 'occupied', meeting: '需求讨论', endTime: '11:00', occupiedAt: now - 25 * 60 * 1000 },
  { id: '6', name: '206', floor: 2, capacity: 8, status: 'idle' },
  { id: '7', name: '301', floor: 3, capacity: 8, status: 'occupied', meeting: '产品评审会', endTime: '10:30', occupiedAt: now - 10 * 60 * 1000 },
  { id: '8', name: '302', floor: 3, capacity: 12, status: 'idle' },
  { id: '9', name: '303', floor: 3, capacity: 6, status: 'occupied', meeting: '周会', endTime: '11:00', occupiedAt: now - 30 * 60 * 1000 },
  { id: '10', name: '304', floor: 3, capacity: 4, status: 'idle' },
  { id: '11', name: '305', floor: 3, capacity: 10, status: 'occupied', meeting: '客户演示', endTime: '10:00', occupiedAt: now - 8 * 60 * 1000 },
  { id: '12', name: '306', floor: 3, capacity: 8, status: 'idle' },
  { id: '13', name: '401', floor: 4, capacity: 8, status: 'idle' },
  { id: '14', name: '402', floor: 4, capacity: 12, status: 'occupied', meeting: '技术方案讨论', endTime: '11:30', occupiedAt: now - 18 * 60 * 1000 },
  { id: '15', name: '403', floor: 4, capacity: 6, status: 'idle' },
  { id: '16', name: '404', floor: 4, capacity: 4, status: 'occupied', meeting: '1:1', endTime: '10:15', occupiedAt: now - 3 * 60 * 1000 },
  { id: '17', name: '405', floor: 4, capacity: 10, status: 'idle' },
  { id: '18', name: '406', floor: 4, capacity: 8, status: 'occupied', meeting: '面试', endTime: '10:45', occupiedAt: now - 45 * 60 * 1000 },
  { id: '19', name: '501', floor: 5, capacity: 16, status: 'occupied', meeting: '全员大会', endTime: '12:00', occupiedAt: now - 60 * 60 * 1000 },
  { id: '20', name: '502', floor: 5, capacity: 8, status: 'idle' },
  { id: '21', name: '503', floor: 5, capacity: 6, status: 'occupied', meeting: '需求评审', endTime: '10:30', occupiedAt: now - 12 * 60 * 1000 },
  { id: '22', name: '504', floor: 5, capacity: 4, status: 'idle' },
  { id: '23', name: '505', floor: 5, capacity: 10, status: 'idle' },
  { id: '24', name: '506', floor: 5, capacity: 8, status: 'occupied', meeting: '迭代回顾', endTime: '11:00', occupiedAt: now - 22 * 60 * 1000 },
]

const MOCK_BOOKINGS: Record<string, Booking[]> = {
  '1': [
    { id: 'b1', roomId: '1', date: '2026-06-02', startTime: '09:00', endTime: '10:00', title: '晨会', organizer: '张伟', attendees: ['张伟', '李娜', '王强'] },
    { id: 'b2', roomId: '1', date: '2026-06-02', startTime: '14:00', endTime: '15:00', title: '项目同步', organizer: '李娜', attendees: ['李娜', '刘洋'] },
    { id: 'b3', roomId: '1', date: '2026-06-02', startTime: '16:00', endTime: '17:00', title: '代码评审', organizer: '王强', attendees: ['王强', '张伟', '李娜', '刘洋'] },
  ],
  '2': [
    { id: 'b4', roomId: '2', date: '2026-06-02', startTime: '10:00', endTime: '10:30', title: '设计评审', organizer: '陈静', attendees: ['陈静', '赵雷', '孙丽'] },
    { id: 'b5', roomId: '2', date: '2026-06-02', startTime: '14:30', endTime: '16:00', title: '产品方案', organizer: '赵雷', attendees: ['赵雷', '陈静', '周涛'] },
  ],
}

for (let i = 3; i <= 24; i++) {
  MOCK_BOOKINGS[String(i)] = [
    { id: `b${i * 2}`, roomId: String(i), date: '2026-06-02', startTime: '09:30', endTime: '10:30', title: '项目讨论', organizer: '张伟', attendees: ['张伟', '李娜', '王强'] },
    { id: `b${i * 2 + 1}`, roomId: String(i), date: '2026-06-02', startTime: '14:00', endTime: '15:30', title: '需求评审', organizer: '李娜', attendees: ['李娜', '刘洋', '陈静', '赵雷'] },
    { id: `b${i * 2 + 2}`, roomId: String(i), date: '2026-06-02', startTime: '16:00', endTime: '17:00', title: '周会', organizer: '王强', attendees: ['王强', '张伟', '李娜', '刘洋', '陈静'] },
  ]
}

function randomlyToggleStatus(rooms: Room[]): Room[] {
  const now = Date.now()
  return rooms.map((room) => {
    if (Math.random() < 0.15) {
      const newStatus = room.status === 'occupied' ? 'idle' : 'occupied'
      return {
        ...room,
        status: newStatus,
        meeting: newStatus === 'occupied' ? '临时会议' : undefined,
        endTime: newStatus === 'occupied' ? `${10 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
        occupiedAt: newStatus === 'occupied' ? now : undefined,
      }
    }
    return room
  })
}

type WSHandler = (msg: WSMessage) => void

export class MockWebSocket {
  private timer: ReturnType<typeof setInterval> | null = null
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private handler: WSHandler | null = null
  private currentRooms: Room[] = [...MOCK_ROOMS]
  private _connected = false

  get connected() {
    return this._connected
  }

  onMessage(handler: WSHandler) {
    this.handler = handler
  }

  connect() {
    if (this._connected) return
    this._connected = true

    if (!this.handler) {
      console.warn('[MockWebSocket] handler not set, deferring initial push')
      return
    }

    this.handler({ type: 'rooms', payload: [...this.currentRooms] })

    this.timer = setInterval(() => {
      this.currentRooms = randomlyToggleStatus(this.currentRooms)
      if (this.handler) {
        this.handler({ type: 'rooms', payload: [...this.currentRooms] })
      }
    }, 5000)

    this.scheduleDisconnect()
  }

  disconnect() {
    this._connected = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }
  }

  reconnect() {
    this.disconnect()
    this.connect()
  }

  getBookings(roomId: string): Booking[] {
    return MOCK_BOOKINGS[roomId] || []
  }

  private scheduleDisconnect() {
    const delay = 15000 + Math.random() * 30000
    this.disconnectTimer = setTimeout(() => {
      this._connected = false
      if (this.handler) {
        this.handler({ type: 'error', payload: [] })
      }
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
      const reconnectDelay = 3000 + Math.random() * 4000
      setTimeout(() => {
        this.reconnect()
      }, reconnectDelay)
    }, delay)
  }
}

export const ws = new MockWebSocket()
