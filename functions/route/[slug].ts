import { readEnv, type SiteEnv } from '../../lib/env';
import { fetchRoutePreview } from '../../lib/fetch-preview';
import { renderLanding, renderNotFound } from '../../lib/render-landing';

type PagesContext = {
  params: { slug: string };
  env: SiteEnv;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const slug = String(context.params.slug ?? '').trim();
  if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    return new Response('Invalid slug', { status: 400 });
  }

  const env = readEnv(context.env);
  try {
    const preview = await fetchRoutePreview(slug, env);
    const html = preview ? renderLanding(preview, env) : renderNotFound(slug, env);
    return new Response(html, {
      status: preview ? 200 : 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        'X-Robots-Tag': preview ? 'index, follow' : 'noindex',
      },
    });
  } catch (error) {
    console.error('route landing error', error);
    return new Response('Preview service unavailable', { status: 502 });
  }
}
