// Supabase client — client-side (browser) usage.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// VITE_* vars are baked into the browser bundle at build time.
// On the server (SSR), they are not available — fall back to process.env.
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  '';

const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  '';

function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL / VITE_SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    // Only warn on the server; the browser bundle always has these baked in.
    if (typeof window === 'undefined') {
      console.warn(`[Supabase] Missing env var(s) on server: ${missing.join(', ')}. Auth will fail.`);
      // Return a no-op client for SSR so pages still render.
      return createClient<Database>('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
    }
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}. Set them in your .env file.`);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
