// Vercel serverless entry point for the PrepPulse API.
//
// Vercel compiles this file with @vercel/node and routes every request
// whose path starts with `/api/` to it (filesystem-convention catch-all
// route). The Express app is a valid `(req, res)` handler, so it can be
// exported directly without any serverless adapter.
//
// Static SPA files are served by Vercel from the build output directory;
// client-side routes fall through to `index.html` via `vercel.json`
// rewrites, and the API keeps serving `/api/*` from this function.
import app from "../artifacts/api-server/src/app";

export default app;