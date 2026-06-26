package main

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestFetchWithRetry_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("<html><head><title>Test Page</title></head><body>Hello</body></html>"))
	}))
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}
	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	c := &Crawler{
		client:    client,
		titleRegex: titleRegex,
	}

	result, err := c.fetchWithRetry(server.URL)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got: %d", result.StatusCode)
	}

	if result.Title != "Test Page" {
		t.Errorf("expected title 'Test Page', got: '%s'", result.Title)
	}

	if result.Attempts != 1 {
		t.Errorf("expected 1 attempt, got: %d", result.Attempts)
	}
}

func TestFetchWithRetry_RetrySuccess(t *testing.T) {
	var requestCount int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		count := atomic.AddInt32(&requestCount, 1)
		if count <= 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("<html><head><title>Retry Success</title></head></html>"))
	}))
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}
	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	c := &Crawler{
		client:    client,
		titleRegex: titleRegex,
	}

	result, err := c.fetchWithRetry(server.URL)
	if err != nil {
		t.Fatalf("expected no error after retry, got: %v", err)
	}

	if result.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got: %d", result.StatusCode)
	}

	if result.Title != "Retry Success" {
		t.Errorf("expected title 'Retry Success', got: '%s'", result.Title)
	}

	if result.Attempts != 2 {
		t.Errorf("expected 2 attempts, got: %d", result.Attempts)
	}

	if count := atomic.LoadInt32(&requestCount); count != 2 {
		t.Errorf("expected 2 requests, got: %d", count)
	}
}

func TestFetchWithRetry_AllAttemptsFail(t *testing.T) {
	var requestCount int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&requestCount, 1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}
	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	c := &Crawler{
		client:    client,
		titleRegex: titleRegex,
	}

	_, err := c.fetchWithRetry(server.URL)
	if err == nil {
		t.Fatal("expected error after all attempts failed")
	}

	if count := atomic.LoadInt32(&requestCount); count != 3 {
		t.Errorf("expected 3 requests (1 + 2 retries), got: %d", count)
	}
}

func TestFetchOnce_Timeout(t *testing.T) {
	delay := 200 * time.Millisecond
	timeout := 100 * time.Millisecond

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(delay)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := &http.Client{Timeout: timeout}
	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	c := &Crawler{
		client:    client,
		titleRegex: titleRegex,
	}

	result := c.fetchOnce(server.URL)

	if result.Error == "" {
		t.Error("expected timeout error, got none")
	}

	if result.StatusCode != 0 {
		t.Errorf("expected status 0 for timeout, got: %d", result.StatusCode)
	}
}

func TestConcurrentLimit(t *testing.T) {
	const (
		concurrentLimit = 2
		totalRequests   = 10
	)

	var (
		activeRequests int32
		maxConcurrent  int32
		mu             sync.Mutex
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current := atomic.AddInt32(&activeRequests, 1)

		mu.Lock()
		if current > maxConcurrent {
			maxConcurrent = current
		}
		mu.Unlock()

		time.Sleep(50 * time.Millisecond)

		atomic.AddInt32(&activeRequests, -1)

		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("<html><head><title>OK</title></head></html>"))
	}))
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}
	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	c := &Crawler{
		client:    client,
		titleRegex: titleRegex,
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, concurrentLimit)
	errCount := 0

	for i := 0; i < totalRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			sem <- struct{}{}
			defer func() { <-sem }()

			result, err := c.fetchWithRetry(server.URL)
			if err != nil {
				errCount++
				return
			}
			if result.StatusCode != http.StatusOK {
				errCount++
			}
		}()
	}

	wg.Wait()

	if errCount > 0 {
		t.Errorf("expected 0 errors, got: %d", errCount)
	}

	mu.Lock()
	defer mu.Unlock()

	if maxConcurrent > int32(concurrentLimit) {
		t.Errorf("expected max concurrent <= %d, got: %d", concurrentLimit, maxConcurrent)
	}

	t.Logf("Max concurrent requests: %d (limit: %d)", maxConcurrent, concurrentLimit)
}

func TestFetchOnce_NoTitle(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("<html><body>No title here</body></html>"))
	}))
	defer server.Close()

	client := &http.Client{Timeout: 5 * time.Second}
	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	c := &Crawler{
		client:    client,
		titleRegex: titleRegex,
	}

	result := c.fetchOnce(server.URL)

	if result.Error != "" {
		t.Errorf("expected no error, got: %s", result.Error)
	}

	if result.Title != "N/A" {
		t.Errorf("expected title 'N/A', got: '%s'", result.Title)
	}
}
