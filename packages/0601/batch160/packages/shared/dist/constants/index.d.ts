import { InspectionCategory } from '../types';
export declare const INSPECTION_CATEGORIES: InspectionCategory[];
export declare const getMaxTotalScore: () => number;
export declare const getScoreLevel: (score: number, maxScore: number) => "excellent" | "good" | "average" | "poor";
export declare const SCORE_LEVEL_LABELS: Record<string, string>;
export declare const STATUS_LABELS: Record<string, string>;
export declare const STATUS_COLORS: Record<string, string>;
