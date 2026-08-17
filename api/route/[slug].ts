import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readEnv } from '../../lib/env';
import { fetchRoutePreview } from '../../lib/fetch-preview';
import { renderLanding, renderNotFound } from '../../lib/render-landing';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).setHeader('Allow', 'GET, HEAD').end();
    return;
  }

  const slug = String(req.query.slug ?? '').trim();
  if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    res.status(400).send('Invalid slug');
    return;
  }

  const env = readEnv();
  try {
    const preview = await fetchRoutePreview(slug, env);
    const html = preview ? renderLanding(preview, env) : renderNotFound(slug, env);
    const status = preview ? 200 : 404;

    res
      .status(status)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('X-Robots-Tag', preview ? 'index, follow' : 'noindex')
      .send(req.method === 'HEAD' ? '' : html);
  } catch (error) {
    console.error('route landing error', error);
    res.status(502).send('Preview service unavailable');
  }
}
