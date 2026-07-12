import "server-only";

import { createClient } from "@supabase/supabase-js";

export const SUBMISSION_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "deck-submissions";

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL。");
  }

  if (!secretKey) {
    throw new Error(
      "缺少 SUPABASE_SECRET_KEY 或 SUPABASE_SERVICE_ROLE_KEY。",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
