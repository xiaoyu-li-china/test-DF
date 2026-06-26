package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
	"golang.org/x/sync/errgroup"
)

const (
	maxRetries     = 2
	requestTimeout  = 5 * time.Second
	retryDelay      = 500 * time.Millisecond
	dbPath          = "./crawler.db"
)

type Result struct {
	URL        string
	StatusCode int
	Title      string
	Error      string
	Duration   time.Duration
	Attempts   int
}

type Crawler struct {
	db        *sql.DB
	client    *http.Client
	titleRegex *regexp.Regexp
}

func NewCrawler() (*Crawler, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	if err := initDB(db); err != nil {
		return nil, err
	}

	client := &http.Client{
		Timeout: requestTimeout,
	}

	titleRegex := regexp.MustCompile(`(?i)<title>(.*?)</title>`)

	return &Crawler{
		db:        db,
		client:    client,
		titleRegex: titleRegex,
	}, nil
}

func (c *Crawler) Close() error {
	return c.db.Close()
}

func initDB(db *sql.DB) error {
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS pages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		url TEXT NOT NULL UNIQUE,
		status INTEGER,
		title TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.Exec(createTableSQL)
	return err
}

func (c *Crawler) urlExists(url string) (bool, error) {
	var count int
	err := c.db.QueryRow("SELECT COUNT(*) FROM pages WHERE url = ?", url).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (c *Crawler) saveResult(result Result) error {
	_, err := c.db.Exec(
		"INSERT OR REPLACE INTO pages (url, status, title) VALUES (?, ?, ?)",
		result.URL,
		result.StatusCode,
		result.Title,
	)
	return err
}

func (c *Crawler) getPendingURLs(urls []string) ([]string, error) {
	if len(urls) == 0 {
		return nil, nil
	}

	placeholders := make([]string, len(urls))
	args := make([]interface{}, len(urls))
	for i, u := range urls {
		placeholders[i] = "?"
		args[i] = u
	}

	query := fmt.Sprintf("SELECT url FROM pages WHERE url IN (%s)",
		strings.Join(placeholders, ","))

	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	crawled := make(map[string]bool)
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err != nil {
			return nil, err
		}
		crawled[u] = true
	}

	var pending []string
	for _, u := range urls {
		if !crawled[u] {
			pending = append(pending, u)
		}
	}

	return pending, nil
}

func main() {
	urls := []string{
		"https://www.baidu.com",
		"https://www.github.com",
		"https://www.bing.com",
		"https://www.qq.com",
		"https://www.taobao.com",
		"https://www.jd.com",
		"https://www.zhihu.com",
		"https://www.douban.com",
		"https://www.weibo.com",
		"https://www.163.com",
	}

	crawler, err := NewCrawler()
	if err != nil {
		fmt.Printf("Failed to initialize crawler: %v\n", err)
		return
	}
	defer crawler.Close()

	pendingURLs, err := crawler.getPendingURLs(urls)
	if err != nil {
		fmt.Printf("Failed to check existing URLs: %v\n", err)
		return
	}

	skipped := len(urls) - len(pendingURLs)
	if skipped > 0 {
		fmt.Printf("Found %d already crawled URLs, will skip them\n", skipped)
	}

	if len(pendingURLs) == 0 {
		fmt.Println("All URLs have been crawled. Done.")
		return
	}

	fmt.Printf("Starting crawl %d pending URLs...\n\n", len(pendingURLs))

	results := make(chan Result, len(pendingURLs))
	var allErrors []error
	var errMu sync.Mutex
	var dbMu sync.Mutex

	g, ctx := errgroup.WithContext(context.Background())
	g.SetLimit(10)

	for _, url := range pendingURLs {
		u := url
		g.Go(func() error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}

			result, err := crawler.fetchWithRetry(u)
			results <- result

			if err != nil {
				errMu.Lock()
				allErrors = append(allErrors, fmt.Errorf("url %s failed after %d attempts: %w", u, result.Attempts, err))
				errMu.Unlock()
				return nil
			}

			dbMu.Lock()
			defer dbMu.Unlock()
			if saveErr := crawler.saveResult(result); saveErr != nil {
				errMu.Lock()
				allErrors = append(allErrors, fmt.Errorf("failed to save %s: %w", u, saveErr))
				errMu.Unlock()
			}

			return nil
		})
	}

	go func() {
		_ = g.Wait()
		close(results)
	}()

	fmt.Printf("%-30s %-8s %-40s %-10s %-15s %s\n", "URL", "STATUS", "TITLE", "ATTEMPTS", "DURATION", "ERROR")
	fmt.Println(strings.Repeat("-", 140))

	successCount := 0
	failCount := 0

	for res := range results {
		title := res.Title
		if len(title) > 38 {
			title = title[:38] + "..."
		}

		if res.Error != "" {
			failCount++
		} else {
			successCount++
		}

		fmt.Printf("%-30s %-8d %-40s %-10d %-15v %s\n",
			truncate(res.URL, 28),
			res.StatusCode,
			title,
			res.Attempts,
			res.Duration.Round(time.Millisecond),
			truncate(res.Error, 50),
		)
	}

	fmt.Println(strings.Repeat("-", 140))
	fmt.Printf("Summary: Success=%d, Failed=%d, Skipped=%d, Total=%d\n",
		successCount, failCount, skipped, len(urls))

	if len(allErrors) > 0 {
		fmt.Println("\nCollected errors:")
		for i, err := range allErrors {
			fmt.Printf("  %d. %v\n", i+1, err)
		}
	}
}

func (c *Crawler) fetchWithRetry(url string) (Result, error) {
	var lastErr error
	var result Result
	start := time.Now()

	for attempt := 1; attempt <= maxRetries+1; attempt++ {
		result = c.fetchOnce(url)
		result.Attempts = attempt

		if result.Error == "" {
			result.Duration = time.Since(start)
			return result, nil
		}

		lastErr = fmt.Errorf("attempt %d: %s", attempt, result.Error)

		if attempt < maxRetries+1 {
			time.Sleep(retryDelay)
		}
	}

	result.Duration = time.Since(start)
	return result, lastErr
}

func (c *Crawler) fetchOnce(url string) Result {
	start := time.Now()
	result := Result{URL: url}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		result.Error = fmt.Sprintf("create request: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	resp, err := c.client.Do(req)
	if err != nil {
		result.Error = err.Error()
		result.Duration = time.Since(start)
		return result
	}
	defer resp.Body.Close()

	result.StatusCode = resp.StatusCode

	if resp.StatusCode >= 500 {
		result.Error = fmt.Sprintf("server error: %d", resp.StatusCode)
		result.Duration = time.Since(start)
		return result
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		result.Error = fmt.Sprintf("read body: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	if match := c.titleRegex.FindSubmatch(body); len(match) > 1 {
		result.Title = strings.TrimSpace(string(match[1]))
	} else {
		result.Title = "N/A"
	}

	result.Duration = time.Since(start)
	return result
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	if n <= 2 {
		return s[:n]
	}
	return s[:n-2] + ".."
}
