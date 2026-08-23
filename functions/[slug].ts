import { readEnv, type SiteEnv } from '../../lib/env';
import { fetchLocalPreview } from '../../lib/fetch-preview';
import {
  isReservedLocalSlug,
  renderLocalNotFound,
  renderLocalPage,
} from '../../lib/render-local';

type PagesContext = {
  params: { slug: string };
  env: SiteEnv;
  next: (input?: Request | string) => Promise<Response>;
  request: Request;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const slug = String(context.params.slug ?? '').trim();
  if (
    !slug ||
    slug.length > 120 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) ||
    isReservedLocalSlug(slug)
  ) {
    return context.next();
  }

  // Let static assets / known files pass through if present.
  const path = new URL(context.request.url).pathname;
  if (path.includes('.') && !path.endsWith('.html')) {
    return context.next();
  }

  const env = readEnv(context.env);
  try {
    const preview = await fetchLocalPreview(slug, env);
    const html = preview
      ? renderLocalPage(preview, env)
      : renderLocalNotFound(slug, env);
    return new Response(html, {
      status: preview ? 200 : 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Robots-Tag': preview ? 'index, follow' : 'noindex',
      },
    });
  } catch (error) {
    console.error('local landing error', error);
    return new Response('Preview service unavailable', { status: 502 });
  }
}
