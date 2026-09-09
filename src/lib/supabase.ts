import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else if (typeof window === "undefined") {
  // During build time, we don't have env vars but we also don't use the client
  supabase = {
    from: () => ({
      select: () => ({
        single: () => ({ data: null, error: null }),
        eq: () => ({ single: () => ({ data: null, error: null }) }),
      }),
    }),
  };
}

export { supabase };
