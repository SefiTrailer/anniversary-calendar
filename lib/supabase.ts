import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bzpweqdrsqnbzisenbzy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cHdlcWRyc3FuYnppc2VuYnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNjAxMzIsImV4cCI6MjEwNTYzNjEzMn0.NgB0TOMmBL5yE1lUPYagRonmlM1M2MrZmqTjPIeCaB4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
