import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are fully configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client successfully initialized.');
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
} else {
  console.warn(
    'Supabase environment variables are missing. App is running in LocalStorage fallback mode.'
  );
}

export { supabase };
