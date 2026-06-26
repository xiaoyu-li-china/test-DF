import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import CountdownTimer from '../CountdownTimer';

const mockHandleLockExpired = vi.fn();

vi.mock('../../store/useSeatStore', () => ({
  useSeatStore: vi.fn(),
}));

vi.mock('../../utils/seatUtils', () => ({
  formatTimeRemaining: vi.fn((ms) => {
    const seconds = Math.ceil(Math.max(0, ms) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }),
}));

import { useSeatStore } from '../../store/useSeatStore';
import { formatTimeRemaining } from '../../utils/seatUtils';

const mockUseSeatStore = useSeatStore as unknown as ReturnType<typeof vi.fn>;
const mockFormatTimeRemaining = formatTimeRemaining as unknown as ReturnType<typeof vi.fn>;

describe('CountdownTimer', () => {
  const baseTime = 1717300000000;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockHandleLockExpired.mockClear();
  });

  const setupStore = (lockExpireAt: number | null, isLocked: boolean) => {
    mockUseSeatStore.mockReturnValue({
      lockExpireAt,
      isLocked,
      handleLockExpired: mockHandleLockExpired,
    });
  };

  it('未锁座时不应渲染', () => {
    setupStore(null, false);

    const { container } = render(<CountdownTimer />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/锁座剩余时间/)).not.toBeInTheDocument();
  });

  it('锁座但无过期时间时不应渲染', () => {
    setupStore(null, true);

    const { container } = render(<CountdownTimer />);
    expect(container.firstChild).toBeNull();
  });

  it('剩余时间15分钟时应显示正常样式', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 15 * 60 * 1000;
    setupStore(lockExpireAt, true);

    render(<CountdownTimer />);

    expect(screen.getByText(/锁座剩余时间/)).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();

    const container = screen.getByText(/锁座剩余时间/).closest('div') as HTMLElement;
    expect(container).toHaveClass('bg-gray-900/80');
    expect(container).not.toHaveClass('bg-red-900/80');
    expect(container).not.toHaveClass('animate-pulse');
  });

  it('剩余时间1分钟时应显示紧急样式（红色+闪烁）', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 60 * 1000;
    setupStore(lockExpireAt, true);

    render(<CountdownTimer />);

    expect(screen.getByText('01:00')).toBeInTheDocument();

    const container = screen.getByText(/锁座剩余时间/).closest('div') as HTMLElement;
    expect(container).toHaveClass('bg-red-900/80');
    expect(container).toHaveClass('animate-pulse');
    expect(container).toHaveClass('border-red-500/50');
  });

  it('剩余时间59秒时应显示紧急样式', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 59 * 1000;
    setupStore(lockExpireAt, true);

    render(<CountdownTimer />);

    expect(screen.getByText('00:59')).toBeInTheDocument();

    const container = screen.getByText(/锁座剩余时间/).closest('div') as HTMLElement;
    expect(container).toHaveClass('bg-red-900/80');
  });

  it('剩余时间1分01秒时应显示正常样式', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 61 * 1000;
    setupStore(lockExpireAt, true);

    render(<CountdownTimer />);

    expect(screen.getByText('01:01')).toBeInTheDocument();

    const container = screen.getByText(/锁座剩余时间/).closest('div') as HTMLElement;
    expect(container).toHaveClass('bg-gray-900/80');
    expect(container).not.toHaveClass('bg-red-900/80');
  });

  it('时间到0时应调用handleLockExpired并停止显示', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 2 * 1000;
    setupStore(lockExpireAt, true);

    const { container } = render(<CountdownTimer />);

    expect(screen.getByText('00:02')).toBeInTheDocument();
    expect(mockHandleLockExpired).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('00:01')).toBeInTheDocument();
    expect(mockHandleLockExpired).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockHandleLockExpired).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it('每秒应更新倒计时显示', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 3 * 1000;
    setupStore(lockExpireAt, true);

    render(<CountdownTimer />);

    expect(screen.getByText('00:03')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:02')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:01')).toBeInTheDocument();
  });

  it('组件卸载时应清除定时器', () => {
    vi.useFakeTimers().setSystemTime(baseTime);
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const lockExpireAt = baseTime + 10 * 60 * 1000;
    setupStore(lockExpireAt, true);

    const { unmount } = render(<CountdownTimer />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('应正确调用formatTimeRemaining格式化剩余时间', () => {
    vi.useFakeTimers().setSystemTime(baseTime);

    const lockExpireAt = baseTime + 10 * 60 * 1000 + 30 * 1000;
    setupStore(lockExpireAt, true);

    render(<CountdownTimer />);

    expect(mockFormatTimeRemaining).toHaveBeenCalled();
    const lastCallArg = mockFormatTimeRemaining.mock.calls[0][0];
    expect(lastCallArg).toBeGreaterThanOrEqual(10 * 60 * 1000 + 29 * 1000);
    expect(lastCallArg).toBeLessThanOrEqual(10 * 60 * 1000 + 30 * 1000);
  });
});
