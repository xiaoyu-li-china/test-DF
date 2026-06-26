import { z } from "zod";

export const LiftInfoSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["chairlift", "gondola", "t-bar"]),
  capacity: z.number().int().positive(),
});

export const HistoryEntrySchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/),
  congestion: z.number().int().min(0).max(100),
});

export const Point3DSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
]);

export const SlopeDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  congestion: z.number().int().min(0).max(100),
  waitTime: z.number().int().min(0),
  lift: LiftInfoSchema,
  history: z.array(HistoryEntrySchema).min(1),
  points: z.array(Point3DSchema).min(3),
});

export const SlopesDatasetSchema = z.array(SlopeDataSchema).min(1);

export type LiftInfo = z.infer<typeof LiftInfoSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type Point3D = z.infer<typeof Point3DSchema>;
export type SlopeData = z.infer<typeof SlopeDataSchema>;
export type SlopesDataset = z.infer<typeof SlopesDatasetSchema>;

export function validateSlopesData(data: unknown): {
  success: boolean;
  data?: SlopesDataset;
  errors?: string[];
} {
  const result = SlopesDatasetSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".") || "root";
    return `[${path}]: ${issue.message}`;
  });

  return { success: false, errors };
}

export function validateSingleSlope(data: unknown): {
  success: boolean;
  data?: SlopeData;
  errors?: string[];
} {
  const result = SlopeDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".") || "root";
    return `[${path}]: ${issue.message}`;
  });

  return { success: false, errors };
}
