export const SUBJECT_COLORS: Record<string, string> = {
  Physics: 'var(--primary)',
  Chemistry: 'var(--warm)',
  Mathematics: 'var(--success)',
  Biology: 'var(--pop)',
};

export function subjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'var(--muted-foreground)';
}