import { createClient } from "@supabase/supabase-js";

// Prefer NEXT_PUBLIC vars for client-side, but allow plain names for server-side config
const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

// Service role / admin key for server-side operations (RPC, elevated ops)
const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!anonUrl || !anonKey) {
  console.warn("Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set. Frontend supabase client may not work.");
}

if (!adminUrl || !adminKey) {
  console.warn("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Server admin client may not work.");
}

// Public (anon) client for frontend usage
export const supabase = createClient(anonUrl, anonKey);

// Admin client for server-side operations (use service role key)
export const supabaseAdmin = createClient(adminUrl, adminKey);

// Default export kept as admin client so server-side imports that use default get elevated client
export default supabaseAdmin;
