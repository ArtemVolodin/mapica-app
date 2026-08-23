import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readEnv } from '../lib/env';

const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'auth_required' });
    return;
  }

  const creatorId = String(
    (req.body as { creator_id?: string } | undefined)?.creator_id ?? '',
  ).trim();
  if (!creatorId) {
    res.status(400).json({ error: 'creator_id_required' });
    return;
  }

  const env = readEnv(process.env as Record<string, string | undefined>);
  const base = (env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anon = env.SUPABASE_ANON_KEY ?? '';
  if (!anon) {
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  try {
    const upstream = await fetch(`${base}/rest/v1/rpc/toggle_creator_follow`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_creator_id: creatorId }),
    });

    const text = await upstream.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!upstream.ok) {
      res.status(upstream.status).json(payload ?? { error: 'follow_failed' });
      return;
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error('follow api error', error);
    res.status(502).json({ error: 'follow_service_unavailable' });
  }
}
