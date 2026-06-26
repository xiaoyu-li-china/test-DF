import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { SeatLayout, Seat, SeatType } from '../../types';
import SeatCanvas from '../SeatCanvas';

const mockToggleSeat = vi.fn();
const mockStoreState = {
  selectedSeats: [] as Seat[],
  recommendedGroups: [] as Seat[][],
  toggleSeat: mockToggleSeat,
  ticketCount: 2,
  isLocked: false,
};

vi.mock('../../store/useSeatStore', () => ({
  useSeatStore: vi.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
}));

vi.mock('../../utils/seatUtils', () => ({
  isInRecommendedGroup: vi.fn(),
}));

import { isInRecommendedGroup } from '../../utils/seatUtils';

const mockIsInRecommendedGroup = isInRecommendedGroup as unknown as ReturnType<typeof vi.fn>;

const SEAT_WIDTH = 36;
const SEAT_HEIGHT = 32;
const SEAT_GAP_X = 8;
const SEAT_GAP_Y = 12;
const PADDING_LEFT = 50;
const PADDING_TOP = 80;

const createMockSeat = (
  id: string,
  row: number,
  col: number,
  status: 'available' | 'sold' | 'selected' | 'locked' = 'available',
  type: SeatType = 'normal'
): Seat => ({
  id,
  row,
  col,
  status,
  type,
});

const createMockLayout = (rows: number, cols: number): SeatLayout => {
  const seats: Seat[] = [];
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      seats.push(
        createMockSeat(`seat-${row}-${col}`, row, col, 'available')
      );
    }
  }
  return {
    sessionId: 'test-session',
    rows,
    cols,
    seats,
    coupleSeatPairs: [],
  };
};

describe('SeatCanvas - 点击坐标Mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockToggleSeat.mockClear();
    mockIsInRecommendedGroup.mockReturnValue(false);
    mockStoreState.selectedSeats = [];
    mockStoreState.recommendedGroups = [];
    mockStoreState.isLocked = false;
    mockStoreState.ticketCount = 2;
  });

  const setupCanvas = (layout: SeatLayout) => {
    const { container } = render(<SeatCanvas layout={layout} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();

    const canvasWidth =
      PADDING_LEFT + layout.cols * (SEAT_WIDTH + SEAT_GAP_X) - SEAT_GAP_X + 30;
    const canvasHeight =
      PADDING_TOP + layout.rows * (SEAT_HEIGHT + SEAT_GAP_Y) - SEAT_GAP_Y + 40;

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 100,
        top: 200,
        width: canvasWidth,
        height: canvasHeight,
        right: 100 + canvasWidth,
        bottom: 200 + canvasHeight,
      }),
      writable: true,
    });

    const mockContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillText: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      setLineDash: vi.fn(),
      shadowColor: '',
      shadowBlur: 0,
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      bezierCurveTo: vi.fn(),
    };

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as unknown as CanvasRenderingContext2D);

    return { canvas, layout, canvasWidth, canvasHeight };
  };

  const calculateSeatCenter = (row: number, col: number) => {
    const x = PADDING_LEFT + (col - 1) * (SEAT_WIDTH + SEAT_GAP_X) + SEAT_WIDTH / 2;
    const y = PADDING_TOP + (row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y) + SEAT_HEIGHT / 2;
    return { x, y };
  };

  const createClickEvent = (canvasX: number, canvasY: number) => {
    const rectLeft = 100;
    const rectTop = 200;
    return {
      clientX: rectLeft + canvasX,
      clientY: rectTop + canvasY,
    };
  };

  it('点击第1排第1座的中心应正确识别座位', () => {
    const layout = createMockLayout(5, 8);
    const { canvas } = setupCanvas(layout);

    const { x, y } = calculateSeatCenter(1, 1);
    const clickEvent = createClickEvent(x, y);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).toHaveBeenCalledTimes(1);
    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.row).toBe(1);
    expect(clickedSeat.col).toBe(1);
    expect(clickedSeat.id).toBe('seat-1-1');
  });

  it('点击第5排第5座的中心应正确识别座位', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const { x, y } = calculateSeatCenter(5, 5);
    const clickEvent = createClickEvent(x, y);

    fireEvent.click(canvas, clickEvent);

    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.row).toBe(5);
    expect(clickedSeat.col).toBe(5);
  });

  it('点击第10排第14座（最后一个座位）应正确识别', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const { x, y } = calculateSeatCenter(10, 14);
    const clickEvent = createClickEvent(x, y);

    fireEvent.click(canvas, clickEvent);

    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.row).toBe(10);
    expect(clickedSeat.col).toBe(14);
    expect(clickedSeat.id).toBe('seat-10-14');
  });

  it('点击座位左上角边界内应正确识别座位', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const col = 3, row = 3;
    const seatX = PADDING_LEFT + (col - 1) * (SEAT_WIDTH + SEAT_GAP_X);
    const seatY = PADDING_TOP + (row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y);
    const clickEvent = createClickEvent(seatX + 2, seatY + 2);

    fireEvent.click(canvas, clickEvent);

    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.row).toBe(row);
    expect(clickedSeat.col).toBe(col);
  });

  it('点击座位右下角边界内应正确识别座位', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const col = 7, row = 7;
    const seatX = PADDING_LEFT + (col - 1) * (SEAT_WIDTH + SEAT_GAP_X);
    const seatY = PADDING_TOP + (row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y);
    const clickEvent = createClickEvent(
      seatX + SEAT_WIDTH - 2,
      seatY + SEAT_HEIGHT - 2
    );

    fireEvent.click(canvas, clickEvent);

    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.row).toBe(row);
    expect(clickedSeat.col).toBe(col);
  });

  it('点击座位之间的间隙不应识别任何座位', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const col = 5, row = 5;
    const seatX = PADDING_LEFT + (col - 1) * (SEAT_WIDTH + SEAT_GAP_X);
    const gapX = seatX + SEAT_WIDTH + 2;
    const gapY = PADDING_TOP + (row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y) + SEAT_HEIGHT + 2;
    const clickEvent = createClickEvent(gapX, gapY);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).not.toHaveBeenCalled();
  });

  it('点击Canvas边界外（左侧padding区域）不应识别座位', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const clickEvent = createClickEvent(PADDING_LEFT - 10, PADDING_TOP + 50);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).not.toHaveBeenCalled();
  });

  it('点击Canvas边界外（顶部screen区域）不应识别座位', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const clickEvent = createClickEvent(PADDING_LEFT + 50, PADDING_TOP - 10);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).not.toHaveBeenCalled();
  });

  it('点击已售出的座位不应触发toggleSeat', () => {
    const layout = createMockLayout(5, 8);
    layout.seats[0].status = 'sold';

    const { canvas } = setupCanvas(layout);

    const { x, y } = calculateSeatCenter(1, 1);
    const clickEvent = createClickEvent(x, y);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).not.toHaveBeenCalled();
  });

  it('点击已锁定的座位不应触发toggleSeat', () => {
    const layout = createMockLayout(5, 8);
    layout.seats[0].status = 'locked';

    const { canvas } = setupCanvas(layout);

    const { x, y } = calculateSeatCenter(1, 1);
    const clickEvent = createClickEvent(x, y);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).not.toHaveBeenCalled();
  });

  it('isLocked为true时点击可用座位不应触发toggleSeat', () => {
    mockStoreState.isLocked = true;
    const layout = createMockLayout(5, 8);
    const { container } = render(<SeatCanvas layout={layout} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 100,
        top: 200,
        width: 500,
        height: 500,
      }),
    });

    const { x, y } = calculateSeatCenter(1, 1);
    const clickEvent = createClickEvent(x, y);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).not.toHaveBeenCalled();
  });

  it('连续点击多个座位应正确传递', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    for (let i = 1; i <= 3; i++) {
      const { x, y } = calculateSeatCenter(2, i);
      const clickEvent = createClickEvent(x, y);
      fireEvent.click(canvas, clickEvent);
    }

    expect(mockToggleSeat).toHaveBeenCalledTimes(3);
    expect(mockToggleSeat.mock.calls[0][0].col).toBe(1);
    expect(mockToggleSeat.mock.calls[1][0].col).toBe(2);
    expect(mockToggleSeat.mock.calls[2][0].col).toBe(3);
  });

  it('坐标计算边界测试 - col=1的左边界', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const seatX = PADDING_LEFT;
    const seatY = PADDING_TOP + SEAT_HEIGHT / 2;

    const clickEvent = createClickEvent(seatX, seatY);
    fireEvent.click(canvas, clickEvent);

    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.col).toBe(1);
  });

  it('坐标计算边界测试 - col最大的右边界', () => {
    const layout = createMockLayout(10, 14);
    const { canvas } = setupCanvas(layout);

    const maxCol = layout.cols;
    const seatX = PADDING_LEFT + (maxCol - 1) * (SEAT_WIDTH + SEAT_GAP_X) + SEAT_WIDTH - 1;
    const seatY = PADDING_TOP + SEAT_HEIGHT / 2;

    const clickEvent = createClickEvent(seatX, seatY);
    fireEvent.click(canvas, clickEvent);

    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.col).toBe(maxCol);
  });

  it('考虑canvas缩放比例时应正确转换坐标', () => {
    const layout = createMockLayout(5, 8);
    const { canvas, canvasWidth } = setupCanvas(layout);

    const displayWidth = canvasWidth * 0.5;
    const displayHeight = 500 * 0.5;

    Object.defineProperty(canvas, 'width', { value: canvasWidth, writable: true });
    Object.defineProperty(canvas, 'height', { value: 500, writable: true });
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({
        left: 100,
        top: 200,
        width: displayWidth,
        height: displayHeight,
      }),
    });

    const { x, y } = calculateSeatCenter(3, 4);
    const displayX = x * 0.5;
    const displayY = y * 0.5;
    const clickEvent = createClickEvent(displayX, displayY);

    fireEvent.click(canvas, clickEvent);

    expect(mockToggleSeat).toHaveBeenCalledTimes(1);
    const clickedSeat = mockToggleSeat.mock.calls[0][0] as Seat;
    expect(clickedSeat.row).toBe(3);
    expect(clickedSeat.col).toBe(4);
  });
});
