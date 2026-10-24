import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbhlmydlachbgoewkdla.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaGxteWRsYWNoYmdvZXdrZGxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjU4NzQsImV4cCI6MjEwODQ0MTg3NH0.EmvQ4_XoJzF3wdw5rSKtCxKc6EY4Hx_95obHz0Wn4kg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
