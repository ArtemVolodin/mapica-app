const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, POST');
    res.status(405).end();
    return;
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL
  ).replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || '';
  if (!anon) {
    res.status(500).send('SUPABASE_ANON_KEY is not configured');
    return;
  }

  const target = new URL(`${supabaseUrl}/functions/v1/local-application-review`);
  for (const [key, value] of Object.entries(req.query || {})) {
    if (typeof value === 'string') target.searchParams.set(key, value);
    else if (Array.isArray(value) && value[0]) {
      target.searchParams.set(key, String(value[0]));
    }
  }

  const headers = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  };

  let body;
  if (req.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    if (typeof req.body === 'string') body = req.body;
    else if (req.body && typeof req.body === 'object') {
      body = JSON.stringify(req.body);
    } else body = '{}';
  }

  const upstream = await fetch(target, {
    method: req.method === 'HEAD' ? 'GET' : req.method || 'GET',
    headers,
    body,
  });

  const text = await upstream.text();
  res.status(upstream.status);
  res.setHeader(
    'Content-Type',
    upstream.headers.get('content-type') || 'text/html; charset=utf-8',
  );
  res.setHeader('Cache-Control', 'no-store');
  res.send(text);
};
