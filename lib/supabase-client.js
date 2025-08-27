import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fqhffciiaztcycvvwrnd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaGZmY2lpYXp0Y3ljdnZ3cm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDA3MjMsImV4cCI6MjA3MTgxNjcyM30.uT540CzkZa-IhOCCgVCG-T2vWkZ1lhkwwyktlGGwVqU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);