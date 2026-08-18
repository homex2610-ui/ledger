const probeFailures: number[] = [];
let lastHealthzAt: string | null = null;

export function recordHealthz(): void {
  lastHealthzAt = new Date().toISOString();
}

export function getLastHealthz(): string | null {
  return lastHealthzAt;
}

export function recordDbProbeFailure(): void {
  probeFailures.push(Date.now());
}

export function recentDbErrors(windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  while (probeFailures.length > 0 && probeFailures[0] < cutoff) probeFailures.shift();
  return probeFailures.length;
}