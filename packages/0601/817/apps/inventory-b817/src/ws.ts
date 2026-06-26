import type { SKUItem, WSMessage } from '@/types'

type MessageHandler = (msg: WSMessage) => void
type LogHandler = (level: 'info' | 'warn' | 'error', message: string) => void

const PROCESSING_DELAY = 300

class MockWebSocketService {
  private handlers: Set<MessageHandler> = new Set()
  private logHandlers: Set<LogHandler> = new Set()
  private inFlight: Set<string> = new Set()
  private isConnected = false
  private pushTimer: ReturnType<typeof setTimeout> | null = null
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null
  private skus: SKUItem[] = []
  private pushInterval: number
  private disconnectMin: number
  private disconnectMax: number
  private reconnectDelay: number
  private isPushing = false

  constructor(options: {
    pushInterval?: number
    disconnectMin?: number
    disconnectMax?: number
    reconnectDelay?: number
  } = {}) {
    this.pushInterval = options.pushInterval ?? 8000
    this.disconnectMin = options.disconnectMin ?? 30000
    this.disconnectMax = options.disconnectMax ?? 60000
    this.reconnectDelay = options.reconnectDelay ?? 5000
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onLog(handler: LogHandler): () => void {
    this.logHandlers.add(handler)
    return () => this.logHandlers.delete(handler)
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    this.logHandlers.forEach((h) => h(level, message))
    if (level === 'info') {
      console.debug(`[ws] ${message}`)
    } else if (level === 'warn') {
      console.warn(`[ws] ${message}`)
    } else {
      console.error(`[ws] ${message}`)
    }
  }

  setSkus(skus: SKUItem[]): void {
    this.skus = skus
  }

  getSkus(): SKUItem[] {
    return this.skus
  }

  private emit(msg: WSMessage): void {
    this.handlers.forEach((h) => h(msg))
  }

  private async processUpdate(sku: SKUItem): Promise<boolean> {
    if (this.inFlight.has(sku.id)) {
      return false
    }

    this.inFlight.add(sku.id)

    try {
      await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY))
      this.emit({ type: 'update', payload: sku })
      this.skus = this.skus.map((s) => (s.id === sku.id ? sku : s))
      this.log('info', `push: ${sku.id} stock=${sku.stock}`)
      return true
    } finally {
      this.inFlight.delete(sku.id)
    }
  }

  private pickSku(): SKUItem | null {
    if (this.skus.length === 0) return null

    const available = this.skus.filter((s) => !this.inFlight.has(s.id))
    if (available.length === 0) return null

    const sku = available[Math.floor(Math.random() * available.length)]
    const delta = Math.floor(Math.random() * 36) - 20
    const newStock = Math.max(0, sku.stock + delta)

    return {
      ...sku,
      stock: newStock,
      updatedAt: Date.now(),
    }
  }

  private async pushTick(): Promise<void> {
    if (!this.isConnected || this.isPushing) return

    this.isPushing = true
    try {
      const update = this.pickSku()
      if (update) {
        await this.processUpdate(update)
      }
    } finally {
      this.isPushing = false
    }
  }

  private scheduleNextPush(): void {
    if (!this.isConnected) return
    this.pushTimer = setTimeout(async () => {
      await this.pushTick()
      this.scheduleNextPush()
    }, this.pushInterval)
  }

  private startPushLoop(): void {
    if (this.pushTimer) return
    this.log('info', 'push loop started')
    this.scheduleNextPush()
  }

  private stopPushLoop(): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer)
      this.pushTimer = null
      this.log('info', 'push loop stopped')
    }
  }

  private scheduleDisconnect(): void {
    const delay =
      Math.random() * (this.disconnectMax - this.disconnectMin) +
      this.disconnectMin
    this.disconnectTimer = setTimeout(() => {
      this.disconnect()
      setTimeout(() => {
        this.reconnect()
      }, this.reconnectDelay)
    }, delay)
    this.log('info', `disconnect scheduled in ${Math.round(delay / 1000)}s`)
  }

  connect(initialSkus: SKUItem[]): void {
    if (this.isConnected) return
    this.skus = initialSkus
    this.isConnected = true
    this.inFlight.clear()
    this.isPushing = false
    this.log('info', 'connected')
    this.emit({ type: 'connected', payload: null })
    this.emit({ type: 'snapshot', payload: [...this.skus] })
    this.startPushLoop()
    this.scheduleDisconnect()
  }

  disconnect(): void {
    if (!this.isConnected) return
    this.isConnected = false
    this.stopPushLoop()
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer)
      this.disconnectTimer = null
    }
    this.inFlight.clear()
    this.isPushing = false
    this.log('warn', 'disconnected')
    this.emit({ type: 'disconnected', payload: null })
  }

  reconnect(): void {
    if (this.isConnected) return
    this.isConnected = true
    this.inFlight.clear()
    this.isPushing = false
    this.log('info', 'reconnected, sending snapshot')
    this.emit({ type: 'connected', payload: null })

    const snapshot = this.skus.map((s) => ({
      ...s,
      stock: Math.max(0, s.stock + Math.floor(Math.random() * 11) - 5),
      updatedAt: Date.now(),
    }))
    this.skus = snapshot
    this.emit({ type: 'snapshot', payload: snapshot })

    this.startPushLoop()
    this.scheduleDisconnect()
  }

  getInFlightCount(): number {
    return this.inFlight.size
  }

  getIsConnected(): boolean {
    return this.isConnected
  }

  destroy(): void {
    this.disconnect()
    this.handlers.clear()
    this.logHandlers.clear()
    this.inFlight.clear()
    this.isPushing = false
    this.log('info', 'destroyed')
  }
}

export const mockWS = new MockWebSocketService({
  pushInterval: 8000,
  disconnectMin: 30000,
  disconnectMax: 60000,
  reconnectDelay: 5000,
})

export type { MockWebSocketService }
