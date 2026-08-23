import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readEnv } from '../lib/env';
import { fetchLocalPreview } from '../lib/fetch-preview';
import {
  isReservedLocalSlug,
  renderLocalNotFound,
  renderLocalPage,
} from '../lib/render-local';

function normalizeSlug(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }

  const slug = normalizeSlug(String(req.query.slug ?? ''));
  if (!slug || slug.length > 120) {
    res.status(404).send('Not found');
    return;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || isReservedLocalSlug(slug)) {
    res.status(404).send('Not found');
    return;
  }

  const env = readEnv(process.env as Record<string, string | undefined>);

  try {
    const preview = await fetchLocalPreview(slug, env);
    const html = preview
      ? renderLocalPage(preview, env)
      : renderLocalNotFound(slug, env);

    res.status(preview ? 200 : 404);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', preview ? 'index, follow' : 'noindex');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.send(html);
  } catch (error) {
    console.error('local landing error', error);
    res.status(502).send('Preview service unavailable');
  }
}
