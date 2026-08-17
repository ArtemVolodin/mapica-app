import type { RoutePreview } from './types';
import type { SiteEnv } from './env';

const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

export async function fetchRoutePreview(
  slug: string,
  env: SiteEnv,
): Promise<RoutePreview | null> {
  const base = (env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anon = env.SUPABASE_ANON_KEY ?? '';
  if (!anon) {
    throw new Error('SUPABASE_ANON_KEY is not configured');
  }

  const url = `${base}/functions/v1/route-preview/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`route-preview ${res.status}`);
  }

  return (await res.json()) as RoutePreview;
}
