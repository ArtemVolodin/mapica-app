const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

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
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="stylesheet" href="/styles/route.css" />
</head>
<body>
  <main class="page">
    <header class="brand"><span class="logo">Mapica</span></header>
    <section class="card empty">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <a class="btn btn-secondary" href="${escapeHtml(appStoreUrl())}">Get Mapica</a>
    </section>
  </main>
</body>
</html>`;
}

function renderLanding(preview) {
  const site = siteUrl();
  const ogImage = preview.og?.image || preview.cover_image_url || `${site}/og-default.svg`;
  const pageUrl = preview.public_url || `${site}/route/${encodeURIComponent(preview.slug)}`;
  const title = preview.title;
  const description = preview.short_description;
  const price = `€${Number(preview.price_eur).toFixed(0)}`;
  const dest = escapeHtml(preview.destination);
  const days = preview.duration_days;
  const metaLine = `${days} day${days === 1 ? '' : 's'} · ${dest}`;
  const statsLine = `${preview.place_count} places · ${preview.walking_km} km walk · ~${preview.estimated_hours}h`;
  const cover = preview.cover_image_url;
  const slugJs = JSON.stringify(preview.slug);
  const store = appStoreUrl();
  const hero = cover
    ? `<div class="hero" style="background-image:url('${escapeHtml(cover)}')"></div>`
    : `<div class="hero hero-fallback"><span>${dest}</span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
  <main class="page">
    <header class="brand">
      <span class="logo">Mapica</span>
      <span class="badge">Local route</span>
    </header>
    <article class="card">
      ${hero}
      <div class="content">
        <p class="local">${escapeHtml(preview.local_display_name)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="pitch">${escapeHtml(description)}</p>
        <p class="meta">${metaLine}</p>
        <p class="stats">${statsLine}</p>
        <p class="price">${escapeHtml(price)}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" id="open-app">Open in Mapica</button>
          <button type="button" class="btn btn-accent" id="adapt-trip">Adapt with Mapica</button>
        </div>
        <div class="store-links">
          <a class="btn btn-secondary" href="${escapeHtml(store)}">App Store</a>
        </div>
        <p class="hint">Exact stops and local tips unlock inside the app after purchase.</p>
      </div>
    </article>
  </main>
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
      document.getElementById('adapt-trip')?.addEventListener('click', function () {
        tryOpenApp('trip/create?adapt=' + encodeURIComponent(slug));
      });
    })();
  </script>
</body>
</html>`;
}

export default async function handler(req, res) {
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
