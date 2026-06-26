package lru

import (
	"sync"
	"time"
)

type entry[K comparable, V any] struct {
	key       K
	value     V
	expiresAt time.Time
	prev      *entry[K, V]
	next      *entry[K, V]
}

type LRU[K comparable, V any] struct {
	mu        sync.Mutex
	capacity  int
	cache     map[K]*entry[K, V]
	head      *entry[K, V]
	tail      *entry[K, V]
	ttl       time.Duration
	stopClean chan struct{}
	cleanOnce sync.Once
}

func NewLRU[K comparable, V any](capacity int) *LRU[K, V] {
	return NewLRUWithTTL[K, V](capacity, 0)
}

func NewLRUWithTTL[K comparable, V any](capacity int, ttl time.Duration) *LRU[K, V] {
	if capacity <= 0 {
		panic("lru: capacity must be positive")
	}
	if ttl < 0 {
		panic("lru: ttl must be non-negative")
	}
	head := &entry[K, V]{}
	tail := &entry[K, V]{}
	head.next = tail
	tail.prev = head
	l := &LRU[K, V]{
		capacity:  capacity,
		cache:     make(map[K]*entry[K, V], capacity),
		head:      head,
		tail:      tail,
		ttl:       ttl,
		stopClean: make(chan struct{}),
	}
	if ttl > 0 {
		cleanInterval := ttl / 2
		if cleanInterval < 100*time.Millisecond {
			cleanInterval = 100 * time.Millisecond
		}
		go l.cleaner(cleanInterval)
	}
	return l
}

func (l *LRU[K, V]) Get(key K) (V, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()

	e, ok := l.cache[key]
	if !ok {
		var zero V
		return zero, false
	}

	if !e.expiresAt.IsZero() && time.Now().After(e.expiresAt) {
		l.remove(e)
		delete(l.cache, e.key)
		var zero V
		return zero, false
	}

	l.moveToFront(e)
	return e.value, true
}

func (l *LRU[K, V]) Set(key K, value V) {
	l.SetWithTTL(key, value, l.ttl)
}

func (l *LRU[K, V]) SetWithTTL(key K, value V, ttl time.Duration) {
	if ttl < 0 {
		panic("lru: ttl must be non-negative")
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	if e, ok := l.cache[key]; ok {
		e.value = value
		if ttl > 0 {
			e.expiresAt = time.Now().Add(ttl)
		} else {
			e.expiresAt = time.Time{}
		}
		l.moveToFront(e)
		return
	}

	var expiresAt time.Time
	if ttl > 0 {
		expiresAt = time.Now().Add(ttl)
	}

	e := &entry[K, V]{key: key, value: value, expiresAt: expiresAt}
	l.cache[key] = e
	l.pushFront(e)

	if len(l.cache) > l.capacity {
		victim := l.tail.prev
		l.remove(victim)
		delete(l.cache, victim.key)
	}
}

func (l *LRU[K, V]) Len() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.cache)
}

func (l *LRU[K, V]) Resize(newCapacity int) {
	if newCapacity <= 0 {
		panic("lru: capacity must be positive")
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.capacity = newCapacity
	for len(l.cache) > l.capacity {
		victim := l.tail.prev
		l.remove(victim)
		delete(l.cache, victim.key)
	}
}

func (l *LRU[K, V]) Cap() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.capacity
}

func (l *LRU[K, V]) Close() {
	l.cleanOnce.Do(func() {
		close(l.stopClean)
	})
}

func (l *LRU[K, V]) cleaner(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			l.cleanExpired()
		case <-l.stopClean:
			return
		}
	}
}

func (l *LRU[K, V]) cleanExpired() {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	for e := l.tail.prev; e != l.head; {
		prev := e.prev
		if !e.expiresAt.IsZero() && now.After(e.expiresAt) {
			l.remove(e)
			delete(l.cache, e.key)
		}
		e = prev
	}
}

func (l *LRU[K, V]) moveToFront(e *entry[K, V]) {
	l.remove(e)
	l.pushFront(e)
}

func (l *LRU[K, V]) remove(e *entry[K, V]) {
	e.prev.next = e.next
	e.next.prev = e.prev
}

func (l *LRU[K, V]) pushFront(e *entry[K, V]) {
	e.prev = l.head
	e.next = l.head.next
	l.head.next.prev = e
	l.head.next = e
}
