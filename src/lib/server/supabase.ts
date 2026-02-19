import { createClient } from '@supabase/supabase-js';
import { requireEnv } from './env';

const supabaseUrl = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SECRET_KEY');

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { persistSession: false }
});
