export interface TidePoint {
  time: string;
  height: number;
  currentSpeed: number;
}

export interface TideEvent {
  type: "high" | "low";
  time: string;
  height: number;
  isNextDay?: boolean;
}

export interface MoonPhase {
  phase: number;
  name: string;
  illumination: number;
}

export interface FishingIndex {
  score: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

export interface DailyTide {
  date: string;
  events: TideEvent[];
  curve: TidePoint[];
  moonPhase: MoonPhase;
  fishingIndex: FishingIndex;
}

export interface SeaArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  timeZone: string;
}

export interface TideApiResponse {
  status: "success" | "error";
  area: SeaArea;
  forecast: DailyTide[];
  requestTime: string;
}

export interface TidalConstant {
  name: string;
  amplitude: number;
  phase: number;
  speed: number;
}

export type ChartMode = "height" | "current";
