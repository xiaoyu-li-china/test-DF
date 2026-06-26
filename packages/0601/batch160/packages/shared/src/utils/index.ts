import dayjs from 'dayjs';
import { getScoreLevel, getMaxTotalScore } from '../constants';
import { Inspection, InspectionSummary, ScoreLevel } from '../types';

export const formatDate = (date: string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const formatTime = (date: string): string => {
  return dayjs(date).format('HH:mm');
};

export const isToday = (date: string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

export const isOverdue = (date: string): boolean => {
  return dayjs(date).isBefore(dayjs(), 'day');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const calculateScorePercentage = (score: number, maxScore: number): number => {
  return Math.round((score / maxScore) * 100);
};

export const transformToSummary = (inspection: Inspection): InspectionSummary => {
  const maxScore = getMaxTotalScore();
  return {
    id: inspection.id,
    storeId: inspection.storeId,
    storeName: inspection.storeName,
    storeAddress: inspection.storeAddress,
    inspectorName: inspection.inspectorName,
    scheduledDate: inspection.scheduledDate,
    status: inspection.status,
    totalScore: inspection.totalScore,
    maxScore: maxScore,
    scoreLevel: getScoreLevel(inspection.totalScore, maxScore) as ScoreLevel,
  };
};
