import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud on purpose — a silent blank screen is much harder to debug than
  // this message the first time someone forgets to fill in .env.local.
  console.error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill in " +
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project settings."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
