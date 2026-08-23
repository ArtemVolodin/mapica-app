const DEFAULT_SUPABASE_URL = 'https://qsstbssltuzglvtrpkvh.supabase.co';

const RESERVED = new Set([
  'route', 'routes', 'privacy', 'terms', 'contact', 'app', 'apps',
  'local', 'locals', 'api', 'images', 'styles', 'home', 'trip', 'trips',
  'profile', 'auth', 'login', 'welcome', 'notifications', 'l', 'index',
  'assets', 'static', 'www', 'admin', 'support', 'about', 'blog', 'help',
  'favicon', 'robots', 'sitemap', 'mapica', 'null', 'undefined',
]);

const HEAD_META = `
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
`;

const PARIS =
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80';
const ITALY =
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1600&q=80';
const TRAVEL =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80';

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

function coverUrl(route) {
  if (route.cover_image_url) return route.cover_image_url;
  const d = String(route.city || route.country || route.title || '').toLowerCase();
  if (d.includes('paris')) return PARIS;
  if (d.includes('nice') || d.includes('italy') || d.includes('cinque')) return ITALY;
  return TRAVEL;
}

async function fetchLocalPreview(slug) {
  const base = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const anon = process.env.SUPABASE_ANON_KEY || '';
  if (!anon) throw new Error('SUPABASE_ANON_KEY is not configured');

  const res = await fetch(`${base}/functions/v1/local-preview/${encodeURIComponent(slug)}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`local-preview ${res.status}`);
  return res.json();
}

function renderNotFound(slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>Local not found · Mapica</title>
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  <main class="empty">
    <p class="kicker">Mapica Local</p>
    <h1>Local not found</h1>
    <p>This Mapica Local page may be unpublished or the link is incorrect.</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl())}">Get the app</a>
  </main>
</body>
</html>`;
}

function renderPage(preview) {
  const site = siteUrl();
  const pageUrl = preview.public_url || `${site}/${encodeURIComponent(preview.slug)}`;
  const name = preview.display_name;
  const about = String(preview.about || '').trim();
  const description = about || `Travel routes by ${name}, a Mapica Local.`;
  const location = [preview.city, preview.country_name].filter(Boolean).join(' · ');
  const languages = (preview.languages || []).filter(Boolean).join(' · ');
  const avatar = (preview.avatar_url || '').trim();
  const ogImage = preview.og?.image || avatar || `${site}/images/og.jpg`;
  const store = appStoreUrl();
  const slugJs = JSON.stringify(preview.slug);
  const initial = escapeHtml(name.trim() ? name.trim().charAt(0).toUpperCase() : 'L');

  const routes = (preview.routes || [])
    .map((route) => {
      const cover = coverUrl(route);
      const days = `${route.duration_days} day${route.duration_days === 1 ? '' : 's'}`;
      const dest = escapeHtml(route.city || route.country || '');
      const price = `€${Number(route.price_eur).toFixed(0)}`;
      return `<a class="route" href="${escapeHtml(route.public_url)}">
        <img src="${escapeHtml(cover)}" alt="" loading="lazy" width="640" height="480" />
        <span class="route-body">
          <span class="route-title">${escapeHtml(route.title)}</span>
          <span class="route-meta">${dest ? `${dest} · ` : ''}${escapeHtml(days)}</span>
          <span class="route-price">${escapeHtml(price)}</span>
        </span>
      </a>`;
    })
    .join('');

  const routesHtml =
    routes ||
    `<p class="empty-routes">No published routes yet. Order a personal trip in the app.</p>`;

  const avatarHtml = avatar
    ? `<img class="avatar" src="${escapeHtml(avatar)}" alt="" width="88" height="88" />`
    : `<div class="avatar avatar-fallback" aria-hidden="true">${initial}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(name)} · Mapica Local</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(preview.og?.title || `${name} · Mapica Local`)}" />
  <meta property="og:description" content="${escapeHtml(preview.og?.description || description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="profile" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  <main class="storefront">
    <section class="identity">
      ${avatarHtml}
      <p class="kicker">Mapica Local</p>
      <h1>${escapeHtml(name)}</h1>
      ${location ? `<p class="location">${escapeHtml(location)}</p>` : ''}
      ${about ? `<p class="about">${escapeHtml(about)}</p>` : ''}
      ${languages ? `<p class="langs">${escapeHtml(languages)}</p>` : ''}
      <p class="stats">${preview.route_count || 0} routes · ${preview.completed_trips || 0} trips</p>
    </section>
    <section class="routes" aria-labelledby="routes-title">
      <h2 id="routes-title">Routes</h2>
      <div class="route-list">${routesHtml}</div>
    </section>
  </main>
  <div class="dock">
    <div class="cta">
      <button type="button" class="btn btn-primary" id="open-app">Order a personal trip</button>
      <a class="btn btn-ghost" href="${escapeHtml(store)}">Get the app</a>
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
        tryOpenApp('l/' + slug);
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
  if (
    !slug ||
    slug.length > 120 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) ||
    RESERVED.has(slug.toLowerCase())
  ) {
    res.status(400).send('Invalid slug');
    return;
  }

  try {
    const preview = await fetchLocalPreview(slug);
    const html = preview ? renderPage(preview) : renderNotFound(slug);
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
};
