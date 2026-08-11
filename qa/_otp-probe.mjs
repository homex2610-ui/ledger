import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const r = await c.auth.signInWithOtp({
  email: process.argv[2],
  options: { emailRedirectTo: process.argv[3] || "https://ledger-pi-topaz.vercel.app" },
});
console.log("error:", r.error ? JSON.stringify(r.error) : "NONE");
