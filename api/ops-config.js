const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).end();
    return;
  }
  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!anonKey) {
    res.status(500).json({ error: 'SUPABASE_ANON_KEY is not configured' });
    return;
  }
  res.status(200).json({ supabaseUrl, anonKey });
};
