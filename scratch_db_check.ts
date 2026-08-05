import { getSupabaseBypassClient } from './lib/supabase-server.ts';
async function test() {
  const sb = await getSupabaseBypassClient();
  const { data: accounts, error: err1 } = await sb.from('accounts').select('*').limit(1);
  console.log('accounts keys:', accounts && accounts.length ? Object.keys(accounts[0]) : 'no accounts');
  const { data: users, error: err2 } = await sb.from('users').select('*').limit(1);
  console.log('users keys:', users && users.length ? Object.keys(users[0]) : 'no users');
  
  // also run the sql to create the profile fields
  const res = await sb.rpc('exec_sql', { query: `
    ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
  ` });
  console.log('rpc result:', res);
}
test();
