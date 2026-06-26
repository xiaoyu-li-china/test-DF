import { useEffect, useRef, useCallback, useState } from 'react';
import type { Seat, SeatLayout } from '../types';
import { useSeatStore } from '../store/useSeatStore';
import { isInRecommendedGroup } from '../utils/seatUtils';

interface SeatCanvasProps {
  layout: SeatLayout;
}

const COLORS = {
  available: '#3D3D5C',
  sold: '#0F0F1A',
  selected: '#FFD700',
  locked: '#E50914',
  recommended: 'rgba(255, 215, 0, 0.3)',
  couple: '#E91E8C',
  coupleSelected: '#FF69B4',
  wheelchair: '#2196F3',
  wheelchairSelected: '#64B5F6',
  screen: '#4A4A6A',
  background: '#1A1A2E',
  text: '#FFFFFF',
  rowLabel: '#6B6B8A',
};

const SEAT_WIDTH = 36;
const SEAT_HEIGHT = 32;
const SEAT_GAP_X = 8;
const SEAT_GAP_Y = 12;
const SCREEN_HEIGHT = 40;
const PADDING_TOP = 80;
const PADDING_LEFT = 50;
const PADDING_RIGHT = 30;
const PADDING_BOTTOM = 40;

export default function SeatCanvas({ layout }: SeatCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rippleRef = useRef<{ x: number; y: number; radius: number; alpha: number } | null>(null);
  const breathRef = useRef(0);

  const {
    selectedSeats,
    recommendedGroups,
    toggleSeat,
    ticketCount,
    isLocked,
  } = useSeatStore();

  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);

  const canvasWidth =
    PADDING_LEFT + layout.cols * (SEAT_WIDTH + SEAT_GAP_X) - SEAT_GAP_X + PADDING_RIGHT;
  const canvasHeight =
    PADDING_TOP + layout.rows * (SEAT_HEIGHT + SEAT_GAP_Y) - SEAT_GAP_Y + PADDING_BOTTOM;

  const selectedSeatIds = new Set(selectedSeats.map((s) => s.id));

  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath();
    const topY = cy - size * 0.4;
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.bezierCurveTo(cx - size, cy, cx - size, topY, cx, topY + size * 0.3);
    ctx.bezierCurveTo(cx + size, topY, cx + size, cy, cx, cy + size * 0.5);
    ctx.closePath();
  };

  const drawWheelchairIcon = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.3, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - size * 0.15, cy - size * 0.3, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.15, cy - size * 0.15);
    ctx.lineTo(cx + size * 0.15, cy - size * 0.15);
    ctx.lineTo(cx + size * 0.15, cy + size * 0.1);
    ctx.lineTo(cx - size * 0.05, cy + size * 0.1);
    ctx.stroke();
  };

  const drawSeat = (
    ctx: CanvasRenderingContext2D,
    seat: Seat,
    x: number,
    y: number
  ) => {
    const isSelected = selectedSeatIds.has(seat.id);
    const isRecommended = isInRecommendedGroup(seat, recommendedGroups);
    const isHovered = hoveredSeat?.id === seat.id;
    const breathPhase = Math.sin(breathRef.current) * 0.15 + 0.85;

    const isCouple = seat.type === 'couple';
    const isWheelchair = seat.type === 'wheelchair';

    ctx.save();

    if (isRecommended && !isSelected && seat.status === 'available') {
      ctx.globalAlpha = breathPhase;
      ctx.fillStyle = COLORS.recommended;
      drawRoundedRect(ctx, x - 3, y - 3, SEAT_WIDTH + 6, SEAT_HEIGHT + 6, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (isCouple && seat.status !== 'sold') {
      ctx.strokeStyle = isSelected ? 'rgba(255, 105, 180, 0.5)' : 'rgba(233, 30, 140, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      drawRoundedRect(ctx, x - 2, y - 2, SEAT_WIDTH + 4, SEAT_HEIGHT + 4, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (isHovered && seat.status === 'available' && !isLocked) {
      if (isCouple) {
        ctx.shadowColor = 'rgba(233, 30, 140, 0.8)';
      } else if (isWheelchair) {
        ctx.shadowColor = 'rgba(33, 150, 243, 0.8)';
      } else if (isSelected) {
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      } else {
        ctx.shadowColor = 'rgba(61, 61, 92, 0.8)';
      }
      ctx.shadowBlur = 15;
    }

    const gradient = ctx.createLinearGradient(x, y, x, y + SEAT_HEIGHT);
    if (isSelected) {
      if (isCouple) {
        gradient.addColorStop(0, '#FF69B4');
        gradient.addColorStop(1, '#E91E8C');
      } else if (isWheelchair) {
        gradient.addColorStop(0, '#64B5F6');
        gradient.addColorStop(1, '#2196F3');
      } else {
        gradient.addColorStop(0, '#FFE55C');
        gradient.addColorStop(1, '#FFB700');
      }
    } else if (seat.status === 'sold') {
      gradient.addColorStop(0, '#1A1A2E');
      gradient.addColorStop(1, '#0F0F1A');
    } else if (seat.status === 'locked') {
      gradient.addColorStop(0, '#FF4D4D');
      gradient.addColorStop(1, '#E50914');
    } else {
      if (isCouple) {
        gradient.addColorStop(0, '#5C2D5C');
        gradient.addColorStop(1, '#3D1A3D');
      } else if (isWheelchair) {
        gradient.addColorStop(0, '#2D4A5C');
        gradient.addColorStop(1, '#1A3040');
      } else {
        gradient.addColorStop(0, '#4A4A6A');
        gradient.addColorStop(1, '#2D2D4A');
      }
    }

    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, SEAT_WIDTH, SEAT_HEIGHT, 6);
    ctx.fill();

    ctx.shadowBlur = 0;

    if (isCouple && seat.status !== 'sold' && !isSelected) {
      ctx.fillStyle = 'rgba(233, 30, 140, 0.7)';
      drawHeart(ctx, x + SEAT_WIDTH / 2, y + SEAT_HEIGHT / 2, 6);
      ctx.fill();
    } else if (isWheelchair && seat.status !== 'sold' && !isSelected) {
      ctx.strokeStyle = 'rgba(33, 150, 243, 0.8)';
      ctx.fillStyle = 'rgba(33, 150, 243, 0.8)';
      ctx.lineWidth = 1.5;
      drawWheelchairIcon(ctx, x + SEAT_WIDTH / 2, y + SEAT_HEIGHT / 2, 5);
    }

    ctx.restore();
  };

  const drawScreen = (ctx: CanvasRenderingContext2D, width: number) => {
    const screenX = PADDING_LEFT;
    const screenY = 30;
    const screenWidth = width - PADDING_LEFT - PADDING_RIGHT;

    const gradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + SCREEN_HEIGHT);
    gradient.addColorStop(0, 'rgba(74, 74, 106, 0.8)');
    gradient.addColorStop(0.5, 'rgba(74, 74, 106, 0.4)');
    gradient.addColorStop(1, 'rgba(74, 74, 106, 0.1)');

    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, screenX, screenY, screenWidth, SCREEN_HEIGHT, 20);
    ctx.fill();

    ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('银 幕', screenX + screenWidth / 2, screenY + SCREEN_HEIGHT / 2);

    ctx.strokeStyle = 'rgba(74, 74, 106, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + SCREEN_HEIGHT + 10);
    ctx.quadraticCurveTo(
      screenX + screenWidth / 2,
      screenY + SCREEN_HEIGHT + 25,
      screenX + screenWidth,
      screenY + SCREEN_HEIGHT + 10
    );
    ctx.stroke();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawScreen(ctx, canvas.width);

    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.fillStyle = COLORS.rowLabel;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let row = 1; row <= layout.rows; row++) {
      const y = PADDING_TOP + (row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y);
      ctx.fillText(`${row}排`, PADDING_LEFT - 12, y + SEAT_HEIGHT / 2);
    }

    ctx.textAlign = 'center';
    for (let col = 1; col <= layout.cols; col++) {
      const x = PADDING_LEFT + (col - 1) * (SEAT_WIDTH + SEAT_GAP_X) + SEAT_WIDTH / 2;
      const y = PADDING_TOP + layout.rows * (SEAT_HEIGHT + SEAT_GAP_Y) - SEAT_GAP_Y + 25;
      ctx.fillText(`${col}号`, x, y);
    }

    for (const seat of layout.seats) {
      const x = PADDING_LEFT + (seat.col - 1) * (SEAT_WIDTH + SEAT_GAP_X);
      const y = PADDING_TOP + (seat.row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y);
      drawSeat(ctx, seat, x, y);
    }

    if (rippleRef.current) {
      const ripple = rippleRef.current;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${ripple.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [layout, selectedSeatIds, hoveredSeat, recommendedGroups, breathRef.current]);

  useEffect(() => {
    const animate = () => {
      breathRef.current += 0.05;

      if (rippleRef.current) {
        rippleRef.current.radius += 2;
        rippleRef.current.alpha -= 0.02;
        if (rippleRef.current.alpha <= 0) {
          rippleRef.current = null;
        }
      }

      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  const getSeatAtPosition = (clientX: number, clientY: number): Seat | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const col = Math.floor((x - PADDING_LEFT) / (SEAT_WIDTH + SEAT_GAP_X)) + 1;
    const row = Math.floor((y - PADDING_TOP) / (SEAT_HEIGHT + SEAT_GAP_Y)) + 1;

    if (row < 1 || row > layout.rows || col < 1 || col > layout.cols) {
      return null;
    }

    const seatX = PADDING_LEFT + (col - 1) * (SEAT_WIDTH + SEAT_GAP_X);
    const seatY = PADDING_TOP + (row - 1) * (SEAT_HEIGHT + SEAT_GAP_Y);

    if (
      x >= seatX &&
      x <= seatX + SEAT_WIDTH &&
      y >= seatY &&
      y <= seatY + SEAT_HEIGHT
    ) {
      return layout.seats.find((s) => s.row === row && s.col === col) || null;
    }

    return null;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;

    const seat = getSeatAtPosition(e.clientX, e.clientY);
    if (seat && seat.status === 'available') {
      toggleSeat(seat);

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        rippleRef.current = {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
          radius: 5,
          alpha: 1,
        };
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const seat = getSeatAtPosition(e.clientX, e.clientY);
    setHoveredSeat(seat);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor =
        seat && seat.status === 'available' && !isLocked ? 'pointer' : 'default';
    }
  };

  const handleMouseLeave = () => {
    setHoveredSeat(null);
  };

  return (
    <div className="flex justify-center items-start py-4 overflow-x-auto">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="rounded-xl"
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />
    </div>
  );
}
