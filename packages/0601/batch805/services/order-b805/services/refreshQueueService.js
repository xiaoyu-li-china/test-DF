const { REFRESH_STATUS } = require("../constants/refreshStatus");

class RefreshQueueService {
  constructor(refreshFn) {
    this.items = new Map();
    this.listeners = new Set();
    this.refreshFn = refreshFn;
    this.refreshPromises = new Map();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const snapshot = this.getItems();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  getItems() {
    return Array.from(this.items.values());
  }

  getItem(id) {
    return this.items.get(id) || null;
  }

  add(id, payload = {}) {
    if (this.items.has(id)) return this.items.get(id);
    const item = {
      id,
      payload,
      status: REFRESH_STATUS.PENDING,
      error: null,
      createdAt: Date.now(),
    };
    this.items.set(id, item);
    this.notify();
    return item;
  }

  async refresh(id) {
    const item = this.items.get(id);
    if (!item) throw new Error(`Item ${id} not found`);

    if (this.refreshPromises.has(id)) {
      return this.refreshPromises.get(id);
    }

    const promise = this._doRefresh(id, item);
    this.refreshPromises.set(id, promise);

    try {
      return await promise;
    } finally {
      this.refreshPromises.delete(id);
    }
  }

  async _doRefresh(id, item) {
    if (
      item.status === REFRESH_STATUS.REFRESHING ||
      item.status === REFRESH_STATUS.SUCCESS
    ) {
      return item;
    }

    item.status = REFRESH_STATUS.REFRESHING;
    item.error = null;
    this.notify();

    try {
      await this.refreshFn(id, item.payload);
      this.items.delete(id);
      this.notify();
      return { id, status: REFRESH_STATUS.SUCCESS, removed: true };
    } catch (err) {
      item.status = REFRESH_STATUS.FAILED;
      item.error = err.message || String(err);
      this.notify();
      return {
        id,
        status: REFRESH_STATUS.FAILED,
        error: item.error,
        removed: false,
      };
    }
  }

  retry(id) {
    const item = this.items.get(id);
    if (!item) return null;
    if (item.status === REFRESH_STATUS.REFRESHING) {
      return this.refreshPromises.get(id) || null;
    }
    item.status = REFRESH_STATUS.PENDING;
    item.error = null;
    this.notify();
    return this.refresh(id);
  }

  remove(id) {
    const existed = this.items.has(id);
    this.items.delete(id);
    if (existed) this.notify();
    return existed;
  }

  clear() {
    this.items.clear();
    this.notify();
  }

  getStats() {
    const items = this.getItems();
    return {
      total: items.length,
      pending: items.filter((i) => i.status === REFRESH_STATUS.PENDING).length,
      refreshing: items.filter((i) => i.status === REFRESH_STATUS.REFRESHING)
        .length,
      failed: items.filter((i) => i.status === REFRESH_STATUS.FAILED).length,
    };
  }
}

module.exports = { RefreshQueueService };
