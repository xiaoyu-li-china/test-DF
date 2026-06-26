export interface QueuedRequest {
  id: string
  url: string
  method: string
  data: unknown
  createdAt: number
  status: 'pending' | 'retrying' | 'failed'
  retries: number
  error?: string
}

type Listener = (queue: QueuedRequest[]) => void

const STORAGE_KEY = 'offline-queue'

let queue: QueuedRequest[] = loadQueue()
let listeners = new Set<Listener>()
let isOnline = navigator.onLine
let retryTimer: ReturnType<typeof setTimeout> | null = null

function loadQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
  }
}

function emit() {
  listeners.forEach((fn) => fn([...queue]))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function enqueueRequest(url: string, method: string, data: unknown): QueuedRequest {
  const entry: QueuedRequest = {
    id: generateId(),
    url,
    method,
    data,
    createdAt: Date.now(),
    status: 'pending',
    retries: 0,
  }
  queue = [...queue, entry]
  saveQueue()
  emit()
  return entry
}

export function dequeueRequest(id: string) {
  queue = queue.filter((r) => r.id !== id)
  saveQueue()
  emit()
}

export function updateRequest(id: string, patch: Partial<QueuedRequest>) {
  queue = queue.map((r) => (r.id === id ? { ...r, ...patch } : r))
  saveQueue()
  emit()
}

export function clearQueue() {
  queue = []
  saveQueue()
  emit()
}

export function getQueue(): QueuedRequest[] {
  return [...queue]
}

export function getPendingCount(): number {
  return queue.filter((r) => r.status === 'pending' || r.status === 'retrying').length
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  listener([...queue])
  return () => {
    listeners.delete(listener)
  }
}

async function trySend(entry: QueuedRequest): Promise<boolean> {
  try {
    const response = await fetch(entry.url, {
      method: entry.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
      },
      body: JSON.stringify(entry.data),
    })
    return response.ok
  } catch {
    return false
  }
}

async function processQueue() {
  if (!isOnline) return

  const pending = queue.filter((r) => r.status === 'pending' || r.status === 'retrying')

  for (const entry of pending) {
    if (!isOnline) break

    updateRequest(entry.id, { status: 'retrying', retries: entry.retries + 1 })

    const ok = await trySend(entry)

    if (ok) {
      dequeueRequest(entry.id)
    } else {
      updateRequest(entry.id, {
        status: entry.retries >= 3 ? 'failed' : 'pending',
        error: entry.retries >= 3 ? 'Max retries reached' : undefined,
      })
    }
  }
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    if (isOnline) {
      processQueue()
    }
    scheduleRetry()
  }, 5000)
}

function handleOnline() {
  isOnline = true
  processQueue()
}

function handleOffline() {
  isOnline = false
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  scheduleRetry()
}

export function flushQueue() {
  if (isOnline) {
    processQueue()
  }
}

export function isNetworkOnline(): boolean {
  return isOnline
}
