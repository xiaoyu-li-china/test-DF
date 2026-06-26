const { RefreshQueueService } = require("../services/refreshQueueService");
const { REFRESH_STATUS } = require("../constants/refreshStatus");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("RefreshQueueService", () => {
  it("should share refresh promise for concurrent calls on same id", async () => {
    let callCount = 0;
    const refreshFn = jest.fn(async () => {
      callCount++;
      await delay(50);
    });
    const queue = new RefreshQueueService(refreshFn);

    queue.add("order-1", { amount: 100 });
    const p1 = queue.refresh("order-1");
    const p2 = queue.refresh("order-1");
    const p3 = queue.refresh("order-1");

    const results = await Promise.all([p1, p2, p3]);
    expect(callCount).toBe(1);
    expect(results.every((r) => r.removed === true)).toBe(true);
    expect(queue.getItem("order-1")).toBeNull();
  });

  it("should mark item as failed and keep it when refresh fails", async () => {
    const refreshFn = jest.fn(async () => {
      throw new Error("network error");
    });
    const queue = new RefreshQueueService(refreshFn);

    queue.add("order-2", { amount: 50 });
    const result = await queue.refresh("order-2");

    expect(result.status).toBe(REFRESH_STATUS.FAILED);
    expect(result.error).toBe("network error");
    expect(result.removed).toBe(false);

    const item = queue.getItem("order-2");
    expect(item).not.toBeNull();
    expect(item.status).toBe(REFRESH_STATUS.FAILED);
    expect(item.error).toBe("network error");
  });

  it("should remove item only when refresh succeeds", async () => {
    const refreshFn = jest.fn(async () => {
      await delay(10);
    });
    const queue = new RefreshQueueService(refreshFn);

    queue.add("order-A", {});
    expect(queue.getItems().length).toBe(1);

    await queue.refresh("order-A");

    expect(queue.getItems().length).toBe(0);
    expect(queue.getItem("order-A")).toBeNull();
  });

  it("should retry a failed item", async () => {
    let attempts = 0;
    const refreshFn = jest.fn(async () => {
      attempts++;
      if (attempts === 1) throw new Error("first fail");
    });
    const queue = new RefreshQueueService(refreshFn);

    queue.add("order-3", {});
    await queue.refresh("order-3");
    expect(queue.getItem("order-3").status).toBe(REFRESH_STATUS.FAILED);

    const result = await queue.retry("order-3");
    expect(result.status).toBe(REFRESH_STATUS.SUCCESS);
    expect(result.removed).toBe(true);
    expect(queue.getItem("order-3")).toBeNull();
  });

  it("should notify subscribers on state changes", async () => {
    const refreshFn = jest.fn(async () => await delay(10));
    const queue = new RefreshQueueService(refreshFn);
    const spy = jest.fn();
    queue.subscribe(spy);

    queue.add("order-X", {});
    expect(spy).toHaveBeenCalled();
    const callAfterAdd = spy.mock.calls.length;

    await queue.refresh("order-X");
    expect(spy.mock.calls.length).toBeGreaterThan(callAfterAdd);
  });

  it("should set status to REFRESHING during execution", async () => {
    let resolveRefresh;
    const refreshPromise = new Promise(
      (resolve) => (resolveRefresh = resolve)
    );
    const refreshFn = jest.fn(() => refreshPromise);
    const queue = new RefreshQueueService(refreshFn);

    queue.add("order-Y", {});
    const refreshCall = queue.refresh("order-Y");

    await delay(5);
    const item = queue.getItem("order-Y");
    expect(item.status).toBe(REFRESH_STATUS.REFRESHING);

    resolveRefresh();
    await refreshCall;
    expect(queue.getItem("order-Y")).toBeNull();
  });

  it("should return correct stats", () => {
    const refreshFn = jest.fn();
    const queue = new RefreshQueueService(refreshFn);

    queue.add("a", {});
    queue.add("b", {});
    queue.items.get("b").status = REFRESH_STATUS.FAILED;

    const stats = queue.getStats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.failed).toBe(1);
  });
});
