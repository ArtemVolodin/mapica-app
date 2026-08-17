import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (_) {}
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

loadEnv();

const slug = process.argv[2] ?? 'hidden-paris-in-one-day';
const base = (process.env.SUPABASE_URL ?? 'https://qsstbssltuzglvtrpkvh.supabase.co').replace(/\/$/, '');
const anon = process.env.SUPABASE_ANON_KEY ?? '';

if (!anon) {
  console.error('SUPABASE_ANON_KEY missing');
  process.exit(1);
}

const res = await fetch(`${base}/functions/v1/route-preview/${encodeURIComponent(slug)}`, {
  headers: { apikey: anon, Authorization: `Bearer ${anon}` },
});

if (!res.ok) {
  console.error('preview failed', res.status, await res.text());
  process.exit(1);
}

const preview = await res.json();
const ogImage = preview.og?.image ?? preview.cover_image_url ?? 'https://mapica.app/og-default.svg';

console.log('<!DOCTYPE html><html><head>');
console.log(`<title>${escapeHtml(preview.title)} · Mapica</title>`);
console.log(`<meta property="og:title" content="${escapeHtml(preview.og.title)}" />`);
console.log(`<meta property="og:description" content="${escapeHtml(preview.og.description)}" />`);
console.log(`<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
console.log('</head><body><h1>', escapeHtml(preview.title), '</h1></body></html>');
