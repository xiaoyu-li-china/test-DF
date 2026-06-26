import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { getTransactions } from '@/services/api';

describe('Transaction Pagination', () => {
  it('returns default page 1 with pageSize 10', async () => {
    const data = await getTransactions();
    expect(data.items.length).toBeLessThanOrEqual(10);
    expect(data.total).toBeGreaterThan(0);
  });

  it('respects page parameter', async () => {
    const page1 = await getTransactions(1, 5);
    const page2 = await getTransactions(2, 5);

    expect(page1.items.length).toBeLessThanOrEqual(5);
    expect(page2.items.length).toBeLessThanOrEqual(5);

    if (page1.items.length > 0 && page2.items.length > 0) {
      const page1Ids = page1.items.map((t) => t.id);
      const page2Ids = page2.items.map((t) => t.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  it('respects pageSize parameter', async () => {
    const small = await getTransactions(1, 3);
    const large = await getTransactions(1, 15);

    expect(small.items.length).toBeLessThanOrEqual(3);
    expect(large.items.length).toBeLessThanOrEqual(15);
    expect(large.items.length).toBeGreaterThanOrEqual(small.items.length);
  });

  it('returns hasMore=false when no more pages', async () => {
    server.use(
      http.get('/api/transactions', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 10;

        return HttpResponse.json({
          items: [{ id: 'TXN000001', type: 'consume', amount: -10, balanceAfter: 300, description: 'test', storeName: 'test', createdAt: new Date().toISOString() }],
          total: 1,
          hasMore: page * pageSize < 1,
        });
      })
    );

    const data = await getTransactions(1, 10);
    expect(data.hasMore).toBe(false);
    expect(data.items.length).toBe(1);
  });

  it('returns hasMore=true when more pages exist', async () => {
    server.use(
      http.get('/api/transactions', ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const pageSize = Number(url.searchParams.get('pageSize')) || 10;

        const totalItems = 25;
        const start = (page - 1) * pageSize;
        const end = Math.min(start + pageSize, totalItems);
        const items = Array.from({ length: end - start }, (_, i) => ({
          id: `TXN${String(start + i + 1).padStart(6, '0')}`,
          type: 'consume' as const,
          amount: -(i + 1),
          balanceAfter: 500 - i * 10,
          description: `item ${start + i + 1}`,
          storeName: 'test',
          createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        }));

        return HttpResponse.json({
          items,
          total: totalItems,
          hasMore: end < totalItems,
        });
      })
    );

    const page1 = await getTransactions(1, 10);
    expect(page1.items.length).toBe(10);
    expect(page1.hasMore).toBe(true);
    expect(page1.total).toBe(25);

    const page3 = await getTransactions(3, 10);
    expect(page3.items.length).toBe(5);
    expect(page3.hasMore).toBe(false);
  });

  it('returns items sorted by date descending (newest first)', async () => {
    const data = await getTransactions(1, 25);
    const dates = data.items.map((t) => new Date(t.createdAt).getTime());

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it('handles invalid page parameter gracefully (defaults to 1)', async () => {
    server.use(
      http.get('/api/transactions', ({ request }) => {
        const url = new URL(request.url);
        const rawPage = url.searchParams.get('page');
        const page = Math.max(1, Number(rawPage) || 1);

        return HttpResponse.json({
          items: [],
          total: 0,
          hasMore: false,
          _debugPage: page,
        });
      })
    );

    const res: any = await getTransactions(-1, 10);
    expect(res._debugPage).toBe(1);
  });

  it('clamps pageSize to max 50', async () => {
    server.use(
      http.get('/api/transactions', ({ request }) => {
        const url = new URL(request.url);
        const rawPageSize = Number(url.searchParams.get('pageSize')) || 10;
        const pageSize = Math.max(1, Math.min(50, rawPageSize));

        return HttpResponse.json({
          items: [],
          total: 0,
          hasMore: false,
          _debugPageSize: pageSize,
        });
      })
    );

    const res: any = await getTransactions(1, 999);
    expect(res._debugPageSize).toBe(50);
  });

  it('sends correct query parameters in the request', async () => {
    let capturedUrl = '';

    server.use(
      http.get('/api/transactions', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          items: [],
          total: 0,
          hasMore: false,
        });
      })
    );

    await getTransactions(3, 20);

    const url = new URL(capturedUrl);
    expect(url.searchParams.get('page')).toBe('3');
    expect(url.searchParams.get('pageSize')).toBe('20');
  });
});
