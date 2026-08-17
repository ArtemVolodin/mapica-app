import { readEnv } from '../../lib/env';
import { fetchRoutePreview } from '../../lib/fetch-preview';
import { renderLanding, renderNotFound } from '../../lib/render-landing';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  }

  const url = new URL(req.url);
  const slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '').trim();
  if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    return new Response('Invalid slug', { status: 400 });
  }

  const env = readEnv();
  try {
    const preview = await fetchRoutePreview(slug, env);
    const html = preview ? renderLanding(preview, env) : renderNotFound(slug, env);
    return new Response(req.method === 'HEAD' ? null : html, {
      status: preview ? 200 : 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': preview ? 'index, follow' : 'noindex',
      },
    });
  } catch (error) {
    console.error('route landing error', error);
    return new Response('Preview service unavailable', { status: 502 });
  }
}
