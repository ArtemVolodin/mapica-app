import type { LocalPreview, RoutePreview } from './types';
import type { SiteEnv } from './env';

const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

async function supabaseFetch(
  path: string,
  env: SiteEnv,
): Promise<Response> {
  const base = (env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anon = env.SUPABASE_ANON_KEY ?? '';
  if (!anon) {
    throw new Error('SUPABASE_ANON_KEY is not configured');
  }

  return fetch(`${base}${path}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
}

export async function fetchRoutePreview(
  slug: string,
  env: SiteEnv,
): Promise<RoutePreview | null> {
  const res = await supabaseFetch(
    `/functions/v1/route-preview/${encodeURIComponent(slug)}`,
    env,
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`route-preview ${res.status}`);
  }

  return (await res.json()) as RoutePreview;
}

export async function fetchLocalPreview(
  slug: string,
  env: SiteEnv,
): Promise<LocalPreview | null> {
  const res = await supabaseFetch(
    `/functions/v1/local-preview/${encodeURIComponent(slug)}`,
    env,
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`local-preview ${res.status}`);
  }

  return (await res.json()) as LocalPreview;
}
