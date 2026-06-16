export const FREE_LIMITS = {
  maxDocuments: 3,
  maxFileSizeBytes: 15 * 1024 * 1024, // 15 MB
} as const;

export const PREMIUM_LIMITS = {
  maxDocuments: 25,
  maxFileSizeBytes: 30 * 1024 * 1024, // 30 MB
} as const;

export const OUTPUT_VISIBILITY: Record<string, readonly string[]> = {
  free: ['professor_dna', 'predicted_exam'],
  premium: ['extract', 'knowledge_base', 'professor_dna', 'exam_targets', 'predicted_exam'],
} as const;

export function getPlanLimits(plan: 'free' | 'premium') {
  return plan === 'free' ? FREE_LIMITS : PREMIUM_LIMITS;
}

export function getVisibleOutputs(plan: 'free' | 'premium'): readonly string[] {
  return OUTPUT_VISIBILITY[plan];
}

export type Plan = 'free' | 'premium';
