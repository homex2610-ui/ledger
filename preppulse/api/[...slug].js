// Vercel serverless entry point for the PrepPulse API.
//
// This entry imports the prebuilt API bundle (dist/app-handler.mjs) instead of
// the API source graph. Vercel compiles `.ts` function entries with its own
// ts-node-style checker that re-typechecks the entire import graph under
// workspace-level compiler options; a plain `.js` entry is never typechecked,
// so the authoritative `pnpm run typecheck` remains the only type gate.
//
// Static SPA files are served by Vercel from the build output directory;
// client-side routes fall through to `index.html` via `vercel.json`
// rewrites, and the API keeps serving `/api/*` from this function.
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
