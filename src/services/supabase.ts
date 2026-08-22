import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Supabase initialization failed:', error);
    supabase = null;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
}

export function reconfigureSupabase(url: string, key: string): boolean {
  try {
    if (!url || !key) {
      supabase = null;
      return false;
    }
    supabase = createClient(url, key);
    return true;
  } catch (error) {
    console.error('Failed to configure Supabase:', error);
    return false;
  }
}
