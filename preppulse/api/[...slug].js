// Vercel serverless entry point for the PrepPulse API.
//
// This entry imports the prebuilt API bundle (dist/app.mjs) instead of the
// API source graph. Vercel compiles `.js` function entries as CommonJS (the
// workspace package has no "type": "module"), so a static ESM `import` would
// be lowered to `require()` and fail at runtime with ERR_REQUIRE_ESM against
// the ESM bundle. A lazy dynamic `import()` works from CommonJS: the first
// request loads the prebuilt Express app, and the handler promise resolves
// only once the response has been written, which keeps the Vercel node-bridge
// from sending a fallback body before Express finishes.
//
// Static SPA files are served by Vercel from the build output directory;
// client-side routes fall through to `index.html` via `vercel.json`
// rewrites, and the API keeps serving `/api/*` from this function.
let appPromise;

module.exports = async function handler(req, res) {
  if (!appPromise) {
    appPromise = import("../artifacts/api-server/dist/app.mjs").then(
      (m) => m.default,
    );
  }
  const app = await appPromise;
  await new Promise((resolve) => {
    const done = () => {
      res.off("finish", done);
      res.off("close", done);
      resolve();
    };
    res.on("finish", done);
    res.on("close", done);
    app(req, res);
  });
};
