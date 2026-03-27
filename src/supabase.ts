import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://snhffakcrxfklyjdbevm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuaGZmYWtjcnhma2x5amRiZXZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzE5NTcsImV4cCI6MjA5MDA0Nzk1N30.jVLol3InsKkrMc3cWV9_H2Hml8sVNjuhBRPpLOxtHKM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
