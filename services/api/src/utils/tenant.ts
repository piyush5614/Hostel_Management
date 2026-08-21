export const DEFAULT_COLLEGE_ID = process.env.DEFAULT_COLLEGE_ID || 'college-default';
export const DEFAULT_COLLEGE_NAME = process.env.DEFAULT_COLLEGE_NAME || 'Default College';

export function resolveCollegeId(candidate: unknown): string {
  if (typeof candidate !== 'string') {
    return DEFAULT_COLLEGE_ID;
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_COLLEGE_ID;
}
