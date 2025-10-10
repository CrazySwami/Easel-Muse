import { z } from 'zod';

export const SizePresetEnum = z.enum(['sm', 'md', 'lg']);
export type SizePreset = z.infer<typeof SizePresetEnum>;

export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number }> = {
  sm: { width: 420, height: 320 },
  md: { width: 600, height: 480 },
  lg: { width: 840, height: 640 },
};

export const NodeWindowConfigSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  resizable: z.boolean().optional(),
  sizePreset: SizePresetEnum.optional(),
  minHeight: z.number().int().positive().optional(),
});

export type NodeWindowConfig = z.infer<typeof NodeWindowConfigSchema>;


