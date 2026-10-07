import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bxktvnrvpsoejetaxxaq.supabase.co';
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_QTVLYK3r6FTmaLLMi5hCyQ_loaZ3ikl';

export interface SupabaseUploadResult {
  path: string;
  id?: string;
  fullPath?: string;
}

export interface SupabaseSignedUrlResult {
  signedUrl: string;
}

/**
 * Creates a type-safe browser Supabase client using @supabase/ssr
 */
export const createClient = (): SupabaseClient =>
  createBrowserClient(supabaseUrl, supabaseKey);

/**
 * Singleton instance for browser components
 */
export const supabaseBrowser: SupabaseClient = createClient();
