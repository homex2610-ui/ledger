export function formatMinutes(minutes: number): string {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value}m`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatPace(minutes: number, days: number): string {
  const total = Math.max(0, Number(minutes) || 0);
  if (total <= 0 || days <= 0) return '0h/day';
  return `~${(total / 60 / days).toFixed(1).replace(/\.0$/, '')}h/day`;
}

export function formatWeekShare(minutes: number): string {
  const total = Math.max(0, Number(minutes) || 0);
  if (total <= 0) return '0% of a week';
  return `${((total / (60 * 24 * 7)) * 100).toFixed(0)}% of a week`;
}