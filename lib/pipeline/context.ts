/**
 * Pipeline constants -- single source of truth for step ordering,
 * context-window limits, and prompt mappings.
 */

export const STEP_ORDER = [
  "extract",
  "knowledge_base",
  "professor_dna",
  "exam_targets",
  "predicted_exam",
] as const;

export type Step = (typeof STEP_ORDER)[number];

/** Default model context window (DeepSeek V3 = 128K tokens). */
export const MODEL_CONTEXT_WINDOW = 128_000;

/**
 * Max input characters before chunking is needed.
 * ~80% of context window at ~4 chars/token for English text.
 */
export const MAX_INPUT_CHARS = Math.floor(MODEL_CONTEXT_WINDOW * 0.8 * 4);

/** Name of the Supabase storage bucket for pipeline outputs. */
export const STORAGE_BUCKET = "outputs";

