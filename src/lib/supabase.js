import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Balay Urios] ⚠️ Supabase credentials are not configured yet.\n' +
    'To connect your live database:\n' +
    '1. Create a Supabase project at https://supabase.com\n' +
    '2. Paste the SQL from supabase-full-setup.sql into Supabase SQL Editor\n' +
    '3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file'
  );
}

// Fallback dummy URL and Key so createClient does not throw on module initialization
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://dummy-serjon.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'dummy-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
