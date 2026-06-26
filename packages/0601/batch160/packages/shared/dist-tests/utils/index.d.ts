import { Inspection, InspectionSummary } from '../types';
export declare const formatDate: (date: string, format?: string) => string;
export declare const formatDateTime: (date: string) => string;
export declare const formatTime: (date: string) => string;
export declare const isToday: (date: string) => boolean;
export declare const isOverdue: (date: string) => boolean;
export declare const generateId: () => string;
export declare const calculateScorePercentage: (score: number, maxScore: number) => number;
export declare const transformToSummary: (inspection: Inspection) => InspectionSummary;
