export type SubmitStatus = 'idle' | 'debouncing' | 'pending' | 'done' | 'error'

type Listener = (status: SubmitStatus) => void

interface FlightEntry {
  status: SubmitStatus
  promise: Promise<unknown>
  listeners: Set<Listener>
  debounceTimer?: ReturnType<typeof setTimeout>
}

const flightMap = new Map<string, FlightEntry>()

function emit(entry: FlightEntry) {
  entry.listeners.forEach((fn) => fn(entry.status))
}

function ensureEntry(key: string): FlightEntry {
  let entry = flightMap.get(key)
  if (!entry) {
    entry = { status: 'idle', promise: Promise.resolve(), listeners: new Set() }
    flightMap.set(key, entry)
  }
  return entry
}

export function getStatus(key: string): SubmitStatus {
  return flightMap.get(key)?.status ?? 'idle'
}

export function isInFlight(key: string): boolean {
  const s = flightMap.get(key)?.status
  return s === 'pending' || s === 'debouncing'
}

export function subscribe(key: string, listener: Listener): () => void {
  const entry = ensureEntry(key)
  entry.listeners.add(listener)
  listener(entry.status)
  return () => {
    entry.listeners.delete(listener)
  }
}

export function submitOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = flightMap.get(key)
  if (existing && existing.status === 'pending') {
    return existing.promise as Promise<T>
  }

  const entry = ensureEntry(key)
  if (entry.debounceTimer !== undefined) {
    clearTimeout(entry.debounceTimer)
    entry.debounceTimer = undefined
  }

  const promise = (async () => {
    entry.status = 'pending'
    emit(entry)
    try {
      const result = await fn()
      entry.status = 'done'
      emit(entry)
      return result
    } catch (err) {
      entry.status = 'error'
      emit(entry)
      throw err
    }
  })()

  entry.promise = promise
  return promise
}

export function debouncedSubmit<T>(
  key: string,
  fn: () => Promise<T>,
  debounceMs: number = 300
): Promise<T> {
  const existing = flightMap.get(key)

  if (existing && existing.status === 'pending') {
    return existing.promise as Promise<T>
  }

  if (existing && existing.status === 'debouncing') {
    if (existing.debounceTimer !== undefined) {
      clearTimeout(existing.debounceTimer)
    }

    const debouncedPromise = new Promise<T>((resolve, reject) => {
      existing!.debounceTimer = setTimeout(async () => {
        existing!.debounceTimer = undefined
        existing!.status = 'pending'
        emit(existing!)
        try {
          const result = await fn()
          existing!.status = 'done'
          emit(existing!)
          resolve(result)
        } catch (err) {
          existing!.status = 'error'
          emit(existing!)
          reject(err)
        }
      }, debounceMs)
    })

    existing.promise = debouncedPromise
    return debouncedPromise
  }

  const entry = ensureEntry(key)

  const debouncedPromise = new Promise<T>((resolve, reject) => {
    entry.status = 'debouncing'
    emit(entry)

    entry.debounceTimer = setTimeout(async () => {
      entry.debounceTimer = undefined
      entry.status = 'pending'
      emit(entry)
      try {
        const result = await fn()
        entry.status = 'done'
        emit(entry)
        resolve(result)
      } catch (err) {
        entry.status = 'error'
        emit(entry)
        reject(err)
      }
    }, debounceMs)
  })

  entry.promise = debouncedPromise
  return debouncedPromise
}

export function resetKey(key: string) {
  const entry = flightMap.get(key)
  if (!entry) return
  if (entry.debounceTimer !== undefined) {
    clearTimeout(entry.debounceTimer)
  }
  entry.status = 'idle'
  entry.debounceTimer = undefined
  emit(entry)
  flightMap.delete(key)
}

export function resetAll() {
  flightMap.forEach((entry) => {
    if (entry.debounceTimer !== undefined) {
      clearTimeout(entry.debounceTimer)
    }
    entry.status = 'idle'
    emit(entry)
  })
  flightMap.clear()
}
