import { z } from 'zod';

export const PlayerInputModeSchema = z.enum(['speech', 'narration', 'mixed']);
export type PlayerInputMode = z.infer<typeof PlayerInputModeSchema>;

export const PlayerInputClassificationSchema = z.object({
  mode: PlayerInputModeSchema,
  speechContent: z.string().optional(),
  narrationContent: z.string().optional(),
});
export type PlayerInputClassification = z.infer<typeof PlayerInputClassificationSchema>;

/** Optional fields added to SPEAK_INTENT and SPOKE for PL16 classification metadata. */
export const classifiedSpeechFields = {
  inputMode: PlayerInputModeSchema.optional(),
  speechContent: z.string().optional(),
  narrationContent: z.string().optional(),
};