const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

const PARIS_PHOTO =
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80';
const ITALY_PHOTO =
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1600&q=80';
const TRAVEL_PHOTO =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80';

function coverUrl(preview) {
  const existing = preview.cover_image_url;
  if (existing) return existing;
  const d = String(preview.destination || preview.city || '').toLowerCase();
  if (d.includes('paris')) return PARIS_PHOTO;
  if (d.includes('nice') || d.includes('liguria') || d.includes('italy') || d.includes('cinque')) {
    return ITALY_PHOTO;
  }
  return TRAVEL_PHOTO;
}

const HEAD_META = `
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="icon" type="image/png" href="/images/app-icon-180.png" />
  <link rel="apple-touch-icon" href="/images/app-icon.png" />
`;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function siteUrl() {
  return (process.env.SITE_URL || 'https://mapica.app').replace(/\/$/, '');
}

function appStoreUrl() {
  return process.env.APP_STORE_URL || 'https://apps.apple.com/app/mapica';
}

async function fetchPreview(slug) {
  const base = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || '';
  if (!anon) throw new Error('SUPABASE_ANON_KEY is not configured');

  const res = await fetch(`${base}/functions/v1/route-preview/${encodeURIComponent(slug)}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`route-preview ${res.status}`);
  return res.json();
}

function renderNotFound(slug) {
  const title = 'Route not found';
  const description = 'This Mapica route may have been unpublished or the link is incorrect.';
  const url = `${siteUrl()}/route/${encodeURIComponent(slug)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="stylesheet" href="/styles/route.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  <main class="empty">
    <p class="kicker">Local route</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl())}">Get the app</a>
  </main>
</body>
</html>`;
}

function renderLanding(preview) {
  const site = siteUrl();
  const cover = coverUrl(preview);
  const title = preview.title;
  const description = preview.short_description;
  const price = `€${Number(preview.price_eur).toFixed(0)}`;
  const pageUrl = preview.public_url || `${site}/route/${encodeURIComponent(preview.slug)}`;
  const ogImage = preview.og?.image || cover;
  const dest = escapeHtml(preview.destination);
  const days = preview.duration_days;
  const daysLabel = `${days} day${days === 1 ? '' : 's'}`;
  const slugJs = JSON.stringify(preview.slug);
  const store = appStoreUrl();
  const hero = `<div class="hero"><img src="${escapeHtml(cover)}" alt="${dest}" /></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(preview.og?.title || title)}" />
  <meta property="og:description" content="${escapeHtml(preview.og?.description || description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Mapica" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(preview.og?.title || title)}" />
  <meta name="twitter:description" content="${escapeHtml(preview.og?.description || description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <link rel="stylesheet" href="/styles/route.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  ${hero}
  <div class="body">
    <p class="kicker">Local route · ${dest}</p>
    <div class="title-row">
      <h1>${escapeHtml(title)}</h1>
      <p class="price"><span>from</span> ${escapeHtml(price)}</p>
    </div>
    <p class="by">${escapeHtml(preview.local_display_name)}</p>
    <p class="pitch">${escapeHtml(description)}</p>
    <ul class="facts">
      <li>${escapeHtml(daysLabel)}</li>
      <li>${preview.place_count} places</li>
      <li>${preview.walking_km} km</li>
      <li>~${preview.estimated_hours}h</li>
    </ul>
    <p class="hint">Exact stops and local tips unlock in the app after purchase.</p>
  </div>
  <div class="dock">
    <div class="cta">
      <button type="button" class="btn btn-primary" id="open-app">Open in Mapica</button>
    </div>
  </div>
  <script>
    (function () {
      var slug = ${slugJs};
      function tryOpenApp(path) {
        var deepLink = 'mapica://' + path.replace(/^\\//, '');
        var start = Date.now();
        window.location.href = deepLink;
        setTimeout(function () {
          if (Date.now() - start < 1600) {
            window.location.href = ${JSON.stringify(store)};
          }
        }, 1200);
      }
      document.getElementById('open-app')?.addEventListener('click', function () {
        tryOpenApp('route/' + slug);
      });
    })();
  </script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }

  const slug = String(req.query.slug || '').trim();
  if (!slug || slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) {
    res.status(400).send('Invalid slug');
    return;
  }

  try {
    const preview = await fetchPreview(slug);
    const html = preview ? renderLanding(preview) : renderNotFound(slug);
    res.status(preview ? 200 : 404);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', preview ? 'index, follow' : 'noindex');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.send(html);
  } catch (error) {
    console.error('route landing error', error);
    res.status(502).send('Preview service unavailable');
  }
}
