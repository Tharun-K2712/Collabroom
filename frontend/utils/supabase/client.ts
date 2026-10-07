import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bxktvnrvpsoejetaxxaq.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_QTVLYK3r6FTmaLLMi5hCyQ_loaZ3ikl";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
