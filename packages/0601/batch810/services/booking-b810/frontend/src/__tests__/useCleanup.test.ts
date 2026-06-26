import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCleanup } from '../hooks/useCleanup';

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  close = vi.fn();
  send = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

describe('useCleanup - timer cleanup on unmount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should clear setTimeout on unmount', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => {
      const { addTimer } = useCleanup();
      const id = setTimeout(callback, 5000);
      addTimer(id);
    });

    unmount();

    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear setInterval on unmount', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => {
      const { addTimer } = useCleanup();
      const id = setInterval(callback, 1000);
      addTimer(id);
    });

    unmount();

    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should run custom cleanup on unmount', () => {
    const cleanup = vi.fn();

    const { unmount } = renderHook(() => {
      const { addCustomCleanup } = useCleanup();
      addCustomCleanup(cleanup);
    });

    expect(cleanup).not.toHaveBeenCalled();

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useCleanup - websocket cleanup on unmount', () => {
  it('should close WebSocket on unmount when open', () => {
    const ws = new MockWebSocket();

    const { unmount } = renderHook(() => {
      const { addWebSocket } = useCleanup();
      addWebSocket(ws as any);
    });

    expect(ws.close).not.toHaveBeenCalled();

    unmount();

    expect(ws.close).toHaveBeenCalledTimes(1);
  });

  it('should not call close on already closed WebSocket', () => {
    const ws = new MockWebSocket();
    ws.readyState = MockWebSocket.CLOSED;

    const { unmount } = renderHook(() => {
      const { addWebSocket } = useCleanup();
      addWebSocket(ws as any);
    });

    unmount();

    expect(ws.close).not.toHaveBeenCalled();
  });

  it('should close WebSocket that is still connecting', () => {
    const ws = new MockWebSocket();
    ws.readyState = MockWebSocket.CONNECTING;

    const { unmount } = renderHook(() => {
      const { addWebSocket } = useCleanup();
      addWebSocket(ws as any);
    });

    unmount();

    expect(ws.close).toHaveBeenCalledTimes(1);
  });
});

describe('useCleanup - combined timer + websocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should clean up both timer and websocket on unmount', () => {
    const timerCallback = vi.fn();
    const ws = new MockWebSocket();

    const { unmount } = renderHook(() => {
      const { addTimer, addWebSocket } = useCleanup();
      const id = setInterval(timerCallback, 1000);
      addTimer(id);
      addWebSocket(ws as any);
    });

    unmount();

    vi.advanceTimersByTime(5000);
    expect(timerCallback).not.toHaveBeenCalled();
    expect(ws.close).toHaveBeenCalledTimes(1);
  });

  it('should clean up multiple resources on unmount', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();

    const { unmount } = renderHook(() => {
      const { addTimer, addWebSocket } = useCleanup();
      addTimer(setTimeout(cb1, 1000));
      addTimer(setInterval(cb2, 2000));
      addWebSocket(ws1 as any);
      addWebSocket(ws2 as any);
    });

    unmount();

    vi.advanceTimersByTime(5000);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
    expect(ws1.close).toHaveBeenCalledTimes(1);
    expect(ws2.close).toHaveBeenCalledTimes(1);
  });
});
