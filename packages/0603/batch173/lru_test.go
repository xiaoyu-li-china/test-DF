package lru

import (
	"sync"
	"testing"
	"time"
)

func TestBasicSetGet(t *testing.T) {
	c := NewLRU[string, int](10)

	t.Run("miss on empty", func(t *testing.T) {
		v, ok := c.Get("nope")
		if ok {
			t.Fatal("expected miss")
		}
		if v != 0 {
			t.Fatalf("expected zero value, got %d", v)
		}
	})

	t.Run("set then get", func(t *testing.T) {
		c.Set("a", 1)
		v, ok := c.Get("a")
		if !ok || v != 1 {
			t.Fatalf("expected (1, true), got (%d, %v)", v, ok)
		}
	})

	t.Run("update existing key", func(t *testing.T) {
		c.Set("a", 42)
		v, ok := c.Get("a")
		if !ok || v != 42 {
			t.Fatalf("expected (42, true), got (%d, %v)", v, ok)
		}
		if c.Len() != 1 {
			t.Fatalf("update should not increase len, got %d", c.Len())
		}
	})

	t.Run("multiple keys", func(t *testing.T) {
		c.Set("b", 2)
		c.Set("c", 3)
		for k, want := range map[string]int{"a": 42, "b": 2, "c": 3} {
			v, ok := c.Get(k)
			if !ok || v != want {
				t.Errorf("key %q: expected (%d, true), got (%d, %v)", k, want, v, ok)
			}
		}
	})

	t.Run("SetWithTTL then get before expiry", func(t *testing.T) {
		c2 := NewLRU[string, int](5)
		c2.SetWithTTL("ttl", 99, 10*time.Second)
		v, ok := c2.Get("ttl")
		if !ok || v != 99 {
			t.Fatalf("expected (99, true), got (%d, %v)", v, ok)
		}
	})
}

func TestEvictionLRU(t *testing.T) {
	t.Run("capacity 1 evicts on next set", func(t *testing.T) {
		c := NewLRU[string, int](1)
		c.Set("a", 1)
		c.Set("b", 2)
		if _, ok := c.Get("a"); ok {
			t.Fatal("\"a\" should be evicted when capacity is 1")
		}
		if v, ok := c.Get("b"); !ok || v != 2 {
			t.Fatal("\"b\" should be present")
		}
	})

	t.Run("evicts least recently used when full", func(t *testing.T) {
		c := NewLRU[int, string](3)
		c.Set(1, "one")
		c.Set(2, "two")
		c.Set(3, "three")

		c.Get(1)
		c.Get(3)

		c.Set(4, "four")

		if _, ok := c.Get(2); ok {
			t.Fatal("key 2 should be evicted (least recently used)")
		}
		for _, k := range []int{1, 3, 4} {
			if _, ok := c.Get(k); !ok {
				t.Fatalf("key %d should still be present", k)
			}
		}
	})

	t.Run("no Get means insertion order decides eviction", func(t *testing.T) {
		c := NewLRU[int, string](2)
		c.Set(1, "one")
		c.Set(2, "two")
		c.Set(3, "three")

		if _, ok := c.Get(1); ok {
			t.Fatal("key 1 (oldest, no access) should be evicted")
		}
		if c.Len() != 2 {
			t.Fatalf("expected len 2, got %d", c.Len())
		}
	})

	t.Run("repeated Get keeps key alive", func(t *testing.T) {
		c := NewLRU[int, int](3)
		c.Set(1, 1)
		c.Set(2, 2)
		c.Set(3, 3)

		c.Get(1)
		c.Set(4, 4)
		c.Get(1)
		c.Set(5, 5)

		if _, ok := c.Get(1); !ok {
			t.Fatal("key 1 should survive after being accessed twice")
		}
		if _, ok := c.Get(2); ok {
			t.Fatal("key 2 should be evicted eventually")
		}
	})
}

func TestTTLExpiration(t *testing.T) {
	t.Run("expired key returns zero on Get", func(t *testing.T) {
		c := NewLRU[string, int](5)
		c.SetWithTTL("short", 1, 100*time.Millisecond)
		c.Set("permanent", 2)

		if v, ok := c.Get("short"); !ok || v != 1 {
			t.Fatalf("before expiry: expected (1, true), got (%d, %v)", v, ok)
		}

		time.Sleep(150 * time.Millisecond)

		v, ok := c.Get("short")
		if ok {
			t.Fatal("expired key should return ok=false")
		}
		if v != 0 {
			t.Fatalf("expired key should return zero value, got %d", v)
		}

		if v, ok := c.Get("permanent"); !ok || v != 2 {
			t.Fatalf("non-TTL key should still be present, got (%d, %v)", v, ok)
		}
	})

	t.Run("lazy delete removes expired entry from cache", func(t *testing.T) {
		c := NewLRU[string, int](5)
		c.SetWithTTL("x", 10, 100*time.Millisecond)

		time.Sleep(150 * time.Millisecond)

		if c.Len() != 1 {
			t.Fatalf("expired entry should still occupy space until Get, got len=%d", c.Len())
		}
		c.Get("x")
		if c.Len() != 0 {
			t.Fatalf("after Get, expired entry should be removed, got len=%d", c.Len())
		}
	})

	t.Run("default TTL from NewLRUWithTTL", func(t *testing.T) {
		c := NewLRUWithTTL[string, int](5, 100*time.Millisecond)
		defer c.Close()

		c.Set("a", 1)
		c.SetWithTTL("b", 2, 0)

		time.Sleep(150 * time.Millisecond)

		if _, ok := c.Get("a"); ok {
			t.Fatal("key set with default TTL should expire")
		}
		if v, ok := c.Get("b"); !ok || v != 2 {
			t.Fatalf("key with ttl=0 should not expire, got (%d, %v)", v, ok)
		}
	})

	t.Run("background cleaner removes expired keys", func(t *testing.T) {
		c := NewLRUWithTTL[string, int](10, 100*time.Millisecond)
		defer c.Close()

		c.Set("a", 1)
		c.Set("b", 2)
		c.SetWithTTL("c", 3, 0)

		time.Sleep(350 * time.Millisecond)

		if c.Len() != 1 {
			t.Fatalf("background cleaner should remove expired keys, got len=%d", c.Len())
		}
		if v, ok := c.Get("c"); !ok || v != 3 {
			t.Fatalf("non-expiring key should survive, got (%d, %v)", v, ok)
		}
	})

	t.Run("updating key refreshes TTL", func(t *testing.T) {
		c := NewLRU[string, int](5)
		c.SetWithTTL("a", 1, 200*time.Millisecond)

		time.Sleep(100 * time.Millisecond)
		c.SetWithTTL("a", 2, 200*time.Millisecond)

		time.Sleep(150 * time.Millisecond)

		if v, ok := c.Get("a"); !ok || v != 2 {
			t.Fatalf("updated key should still be valid, got (%d, %v)", v, ok)
		}
	})
}

func TestConcurrentSafety(t *testing.T) {
	t.Run("parallel set/get", func(t *testing.T) {
		c := NewLRU[int, int](100)
		var wg sync.WaitGroup
		for i := 0; i < 2000; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				c.Set(i%200, i)
				c.Get(i % 200)
			}(i)
		}
		wg.Wait()
		if c.Len() > 100 {
			t.Fatalf("len should not exceed capacity, got %d", c.Len())
		}
	})

	t.Run("parallel with TTL and background cleaner", func(t *testing.T) {
		c := NewLRUWithTTL[int, int](100, 50*time.Millisecond)
		defer c.Close()

		var wg sync.WaitGroup
		for w := 0; w < 32; w++ {
			wg.Add(1)
			go func(id int) {
				defer wg.Done()
				for i := 0; i < 200; i++ {
					key := (id*200 + i) % 200
					c.Set(key, i)
					c.Get(key)
				}
			}(w)
		}
		wg.Wait()
	})

	t.Run("parallel set/get/resize", func(t *testing.T) {
		c := NewLRU[int, int](50)
		var wg sync.WaitGroup
		done := make(chan struct{})

		go func() {
			defer close(done)
			for i := 0; i < 100; i++ {
				c.Resize(50 + i%51)
			}
		}()

		for i := 0; i < 2000; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				c.Set(i%150, i)
				c.Get(i % 150)
				c.Len()
			}(i)
		}
		wg.Wait()
		<-done
	})
}
