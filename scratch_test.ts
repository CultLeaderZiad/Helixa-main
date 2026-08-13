import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function check() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
  const res = await fetch(url, {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
    }
  });
  const data = await res.json();
  const platformConnections = data.definitions.platform_connections;
  console.log(JSON.stringify(platformConnections, null, 2));
}

check();
