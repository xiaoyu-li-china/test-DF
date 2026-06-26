import type { TidalConstant } from "@/types/tide";

interface SiteTidalConstants {
  [areaId: string]: TidalConstant[];
}

export const TIDAL_CONSTANTS: SiteTidalConstants = {
  shengsi: [
    { name: "M2", amplitude: 175.2, phase: 110.5, speed: 28.984 },
    { name: "S2", amplitude: 72.8, phase: 148.2, speed: 30.0 },
    { name: "N2", amplitude: 36.5, phase: 96.8, speed: 28.44 },
    { name: "K2", amplitude: 20.1, phase: 153.1, speed: 30.082 },
    { name: "K1", amplitude: 40.2, phase: 332.5, speed: 15.041 },
    { name: "O1", amplitude: 33.8, phase: 298.7, speed: 13.943 },
    { name: "P1", amplitude: 13.2, phase: 330.8, speed: 14.959 },
    { name: "Q1", amplitude: 6.8, phase: 285.2, speed: 13.399 },
  ],
  zhoushan: [
    { name: "M2", amplitude: 195.6, phase: 102.3, speed: 28.984 },
    { name: "S2", amplitude: 82.5, phase: 140.5, speed: 30.0 },
    { name: "N2", amplitude: 41.2, phase: 89.6, speed: 28.44 },
    { name: "K2", amplitude: 22.8, phase: 145.2, speed: 30.082 },
    { name: "K1", amplitude: 45.6, phase: 325.8, speed: 15.041 },
    { name: "O1", amplitude: 38.2, phase: 292.3, speed: 13.943 },
    { name: "P1", amplitude: 14.8, phase: 324.1, speed: 14.959 },
    { name: "Q1", amplitude: 7.6, phase: 279.5, speed: 13.399 },
  ],
  ningbo: [
    { name: "M2", amplitude: 168.4, phase: 108.7, speed: 28.984 },
    { name: "S2", amplitude: 70.2, phase: 146.8, speed: 30.0 },
    { name: "N2", amplitude: 35.6, phase: 94.3, speed: 28.44 },
    { name: "K2", amplitude: 19.5, phase: 151.7, speed: 30.082 },
    { name: "K1", amplitude: 38.9, phase: 330.2, speed: 15.041 },
    { name: "O1", amplitude: 32.4, phase: 296.5, speed: 13.943 },
    { name: "P1", amplitude: 12.8, phase: 328.6, speed: 14.959 },
    { name: "Q1", amplitude: 6.5, phase: 283.1, speed: 13.399 },
  ],
  xiangshan: [
    { name: "M2", amplitude: 182.3, phase: 105.2, speed: 28.984 },
    { name: "S2", amplitude: 78.6, phase: 143.8, speed: 30.0 },
    { name: "N2", amplitude: 38.9, phase: 92.5, speed: 28.44 },
    { name: "K2", amplitude: 21.7, phase: 148.3, speed: 30.082 },
    { name: "K1", amplitude: 42.8, phase: 328.6, speed: 15.041 },
    { name: "O1", amplitude: 35.4, phase: 295.1, speed: 13.943 },
    { name: "P1", amplitude: 13.9, phase: 326.8, speed: 14.959 },
    { name: "Q1", amplitude: 7.2, phase: 282.4, speed: 13.399 },
  ],
  taizhou: [
    { name: "M2", amplitude: 158.7, phase: 115.2, speed: 28.984 },
    { name: "S2", amplitude: 66.3, phase: 152.8, speed: 30.0 },
    { name: "N2", amplitude: 33.2, phase: 100.5, speed: 28.44 },
    { name: "K2", amplitude: 18.4, phase: 157.6, speed: 30.082 },
    { name: "K1", amplitude: 36.5, phase: 335.8, speed: 15.041 },
    { name: "O1", amplitude: 30.6, phase: 302.1, speed: 13.943 },
    { name: "P1", amplitude: 12.0, phase: 334.2, speed: 14.959 },
    { name: "Q1", amplitude: 6.1, phase: 288.7, speed: 13.399 },
  ],
  dongtou: [
    { name: "M2", amplitude: 145.8, phase: 120.5, speed: 28.984 },
    { name: "S2", amplitude: 60.9, phase: 157.2, speed: 30.0 },
    { name: "N2", amplitude: 30.5, phase: 105.2, speed: 28.44 },
    { name: "K2", amplitude: 16.9, phase: 162.0, speed: 30.082 },
    { name: "K1", amplitude: 34.2, phase: 340.1, speed: 15.041 },
    { name: "O1", amplitude: 28.4, phase: 306.5, speed: 13.943 },
    { name: "P1", amplitude: 11.2, phase: 338.5, speed: 14.959 },
    { name: "Q1", amplitude: 5.7, phase: 293.2, speed: 13.399 },
  ],
  wenzhou: [
    { name: "M2", amplitude: 152.3, phase: 118.3, speed: 28.984 },
    { name: "S2", amplitude: 63.6, phase: 155.0, speed: 30.0 },
    { name: "N2", amplitude: 31.8, phase: 102.8, speed: 28.44 },
    { name: "K2", amplitude: 17.6, phase: 159.8, speed: 30.082 },
    { name: "K1", amplitude: 35.6, phase: 337.9, speed: 15.041 },
    { name: "O1", amplitude: 29.5, phase: 304.2, speed: 13.943 },
    { name: "P1", amplitude: 11.6, phase: 336.3, speed: 14.959 },
    { name: "Q1", amplitude: 5.9, phase: 291.0, speed: 13.399 },
  ],
};

export const CURRENT_SPEED_COEF: { [areaId: string]: number } = {
  shengsi: 0.02,
  zhoushan: 0.022,
  ningbo: 0.017,
  xiangshan: 0.018,
  taizhou: 0.016,
  dongtou: 0.015,
  wenzhou: 0.016,
};
