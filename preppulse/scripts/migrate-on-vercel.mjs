import { execSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  console.log('[migrate] DATABASE_URL not set in this environment — skipping migrations');
  process.exit(0);
}

console.log('[migrate] DATABASE_URL present — applying pending drizzle migrations');
try {
  execSync('pnpm --filter @workspace/db migrate', { stdio: 'inherit' });
  console.log('[migrate] done');
} catch (error) {
  console.error('[migrate] FAILED', error);
  process.exit(1);
}