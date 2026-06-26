import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import Countdown, { calculateTimeLeft, formatCountdown } from './Countdown.jsx';

describe('calculateTimeLeft', () => {
  it('should return null when target date is in the past', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    expect(calculateTimeLeft(now - 1000)).toBeNull();
  });

  it('should return null when target date is exactly now', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    expect(calculateTimeLeft(now)).toBeNull();
  });

  it('should calculate days, hours, minutes, seconds correctly', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const targetDate = now + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 15 * 60 * 1000 + 45 * 1000;

    const result = calculateTimeLeft(targetDate);
    expect(result).toEqual({ days: 2, hours: 3, minutes: 15, seconds: 45 });
  });

  it('should never return negative values', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const targetDate = now + 500;

    const result = calculateTimeLeft(targetDate);
    expect(result).not.toBeNull();
    expect(result.seconds).toBeGreaterThanOrEqual(0);
    expect(result.minutes).toBeGreaterThanOrEqual(0);
    expect(result.hours).toBeGreaterThanOrEqual(0);
    expect(result.days).toBeGreaterThanOrEqual(0);
  });
});

describe('formatCountdown', () => {
  it('should format with default pattern', () => {
    const timeLeft = { days: 1, hours: 2, minutes: 3, seconds: 4 };
    expect(formatCountdown(timeLeft, '{d}天{h}时{m}分{s}秒')).toBe('01天02时03分04秒');
  });

  it('should use custom separator', () => {
    const timeLeft = { days: 1, hours: 2, minutes: 3, seconds: 4 };
    expect(formatCountdown(timeLeft, '{d}:{h}:{m}:{s}')).toBe('01:02:03:04');
  });

  it('should hide days when zero', () => {
    const timeLeft = { days: 0, hours: 5, minutes: 30, seconds: 15 };
    expect(formatCountdown(timeLeft, '{d}天{h}时{m}分{s}秒')).toBe('05时30分15秒');
  });

  it('should hide hours when both days and hours are zero', () => {
    const timeLeft = { days: 0, hours: 0, minutes: 30, seconds: 15 };
    expect(formatCountdown(timeLeft, '{d}天{h}时{m}分{s}秒')).toBe('30分15秒');
  });

  it('should hide minutes when days, hours, and minutes are all zero', () => {
    const timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 45 };
    expect(formatCountdown(timeLeft, '{d}天{h}时{m}分{s}秒')).toBe('45秒');
  });

  it('should always show seconds even when all other units are zero', () => {
    const timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 5 };
    expect(formatCountdown(timeLeft, '{d}天{h}时{m}分{s}秒')).toBe('05秒');
  });

  it('should show all units when days is non-zero', () => {
    const timeLeft = { days: 3, hours: 0, minutes: 0, seconds: 0 };
    expect(formatCountdown(timeLeft, '{d}天{h}时{m}分{s}秒')).toBe('03天00时00分00秒');
  });
});

describe('Countdown Component', () => {
  let startTime;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'Date',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    startTime = Date.now();
    vi.setSystemTime(startTime);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  const advanceTime = (ms) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  describe('initial render', () => {
    it('should display correct time left with default format', () => {
      const targetDate = startTime + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 15 * 60 * 1000 + 45 * 1000;

      render(<Countdown targetDate={targetDate} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('02天03时15分45秒');
    });

    it('should display "已结束" when target date is in the past', () => {
      render(<Countdown targetDate={startTime - 1000} />);

      expect(screen.getByTestId('countdown-ended')).toHaveTextContent('已结束');
    });

    it('should display "已结束" when target date is exactly now', () => {
      render(<Countdown targetDate={startTime} />);

      expect(screen.getByTestId('countdown-ended')).toHaveTextContent('已结束');
    });

    it('should pad single digit values with leading zero', () => {
      const targetDate = startTime + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 4 * 1000;

      render(<Countdown targetDate={targetDate} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('01天02时03分04秒');
    });

    it('should hide zero-valued higher units by default', () => {
      const targetDate = startTime + 30 * 60 * 1000 + 15 * 1000;

      render(<Countdown targetDate={targetDate} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('30分15秒');
    });
  });

  describe('rendering modes', () => {
    it('should use custom format when provided', () => {
      const targetDate = startTime + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 4 * 1000;

      render(<Countdown targetDate={targetDate} format="{d}:{h}:{m}:{s}" />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('01:02:03:04');
    });

    it('should render default layout when format is empty string', () => {
      const targetDate = startTime + 1 * 60 * 60 * 1000 + 5 * 60 * 1000 + 30 * 1000;

      render(<Countdown targetDate={targetDate} format="" />);

      expect(screen.getByTestId('countdown-days')).toHaveTextContent('00');
      expect(screen.getByTestId('countdown-hours')).toHaveTextContent('01');
      expect(screen.getByTestId('countdown-minutes')).toHaveTextContent('05');
      expect(screen.getByTestId('countdown-seconds')).toHaveTextContent('30');
    });
  });

  describe('updating via requestAnimationFrame', () => {
    it('should update display when time advances', () => {
      const targetDate = startTime + 30 * 1000;

      render(<Countdown targetDate={targetDate} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('30秒');

      advanceTime(5000);
      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('25秒');

      advanceTime(5000);
      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('20秒');
    });

    it('should handle minutes rollover correctly', () => {
      const targetDate = startTime + 1 * 60 * 1000 + 5 * 1000;

      render(<Countdown targetDate={targetDate} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('01分05秒');

      advanceTime(6000);
      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('59秒');
    });
  });

  describe('countdown end', () => {
    it('should display "已结束" when countdown reaches zero', () => {
      const targetDate = startTime + 3 * 1000;

      render(<Countdown targetDate={targetDate} />);

      advanceTime(3000);
      advanceTime(100);

      expect(screen.getByTestId('countdown-ended')).toHaveTextContent('已结束');
    });

    it('should stop updating after countdown ends', () => {
      const targetDate = startTime + 2 * 1000;

      render(<Countdown targetDate={targetDate} />);

      advanceTime(2001);
      expect(screen.getByTestId('countdown-ended')).toHaveTextContent('已结束');

      advanceTime(5000);
      expect(screen.getByTestId('countdown-ended')).toHaveTextContent('已结束');
      expect(screen.queryByTestId('countdown-container')).not.toBeInTheDocument();
    });
  });

  describe('targetDate changes', () => {
    it('should recalculate when targetDate prop changes', () => {
      const { rerender } = render(<Countdown targetDate={startTime + 10 * 1000} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('10秒');

      rerender(<Countdown targetDate={startTime + 60 * 60 * 1000} />);

      expect(screen.getByTestId('countdown-formatted')).toHaveTextContent('01时00分00秒');
    });
  });

  describe('cleanup', () => {
    it('should cancel animation frame on unmount', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const { unmount } = render(<Countdown targetDate={startTime + 10 * 1000} />);

      unmount();

      expect(cancelSpy).toHaveBeenCalled();
      cancelSpy.mockRestore();
    });
  });

  describe('onEnd callback', () => {
    it('should call onEnd when countdown reaches zero', () => {
      const onEnd = vi.fn();
      const targetDate = startTime + 3 * 1000;

      render(<Countdown targetDate={targetDate} onEnd={onEnd} />);

      expect(onEnd).not.toHaveBeenCalled();

      advanceTime(3000);
      advanceTime(100);

      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('should call onEnd immediately when target date is already in the past', () => {
      const onEnd = vi.fn();

      render(<Countdown targetDate={startTime - 1000} onEnd={onEnd} />);

      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('should not call onEnd multiple times after countdown ends', () => {
      const onEnd = vi.fn();
      const targetDate = startTime + 2 * 1000;

      render(<Countdown targetDate={targetDate} onEnd={onEnd} />);

      advanceTime(2001);
      expect(onEnd).toHaveBeenCalledTimes(1);

      advanceTime(5000);
      expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('should call onEnd again when targetDate changes from past to future and back', () => {
      const onEnd = vi.fn();
      const pastTarget = startTime - 1000;
      const futureTarget = startTime + 2 * 1000;

      const { rerender } = render(<Countdown targetDate={pastTarget} onEnd={onEnd} />);
      expect(onEnd).toHaveBeenCalledTimes(1);

      rerender(<Countdown targetDate={futureTarget} onEnd={onEnd} />);
      expect(onEnd).toHaveBeenCalledTimes(1);

      advanceTime(2001);
      expect(onEnd).toHaveBeenCalledTimes(2);
    });
  });
});
