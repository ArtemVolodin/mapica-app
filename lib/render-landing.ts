import type { SiteEnv } from './env';
import type { RoutePreview } from './types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function siteUrl(env: SiteEnv): string {
  return (env.SITE_URL ?? 'https://mapica.app').replace(/\/$/, '');
}

function appStoreUrl(env: SiteEnv): string {
  return env.APP_STORE_URL ?? 'https://apps.apple.com/app/mapica';
}

function playStoreUrl(env: SiteEnv): string | null {
  const url = env.PLAY_STORE_URL?.trim();
  return url || null;
}

export function renderNotFound(slug: string, env: SiteEnv = {}): string {
  const title = 'Route not found';
  const description = 'This Mapica route may have been unpublished or the link is incorrect.';
  const url = `${siteUrl(env)}/route/${encodeURIComponent(slug)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="website" />
  <link rel="stylesheet" href="/styles/route.css" />
</head>
<body>
  <main class="page">
    <header class="brand">
      <span class="logo">Mapica</span>
    </header>
    <section class="card empty">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <a class="btn btn-secondary" href="${escapeHtml(appStoreUrl(env))}">Get Mapica</a>
    </section>
  </main>
</body>
</html>`;
}

export function renderLanding(preview: RoutePreview, env: SiteEnv = {}): string {
  const site = siteUrl(env);
  const defaultOg = `${site}/og-default.svg`;
  const ogImage = preview.og.image ?? preview.cover_image_url ?? defaultOg;
  const pageUrl = preview.public_url || `${site}/route/${encodeURIComponent(preview.slug)}`;
  const title = preview.title;
  const description = preview.short_description;
  const price = `€${preview.price_eur.toFixed(0)}`;
  const metaLine = `${preview.duration_days} day${preview.duration_days === 1 ? '' : 's'} · ${escapeHtml(preview.destination)}`;
  const statsLine = `${preview.place_count} places · ${preview.walking_km} km walk · ~${preview.estimated_hours}h`;
  const appStore = appStoreUrl(env);
  const playStore = playStoreUrl(env);
  const cover = preview.cover_image_url;
  const slugJs = JSON.stringify(preview.slug);
  const routePathJs = JSON.stringify(`/route/${preview.slug}`);

  const playStoreLink = playStore
    ? `<a class="btn btn-secondary" href="${escapeHtml(playStore)}">Google Play</a>`
    : '';

  const hero = cover
    ? `<div class="hero" style="background-image:url('${escapeHtml(cover)}')"></div>`
    : `<div class="hero hero-fallback"><span>${escapeHtml(preview.destination)}</span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(preview.og.title)}" />
  <meta property="og:description" content="${escapeHtml(preview.og.description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="${escapeHtml(preview.og.type)}" />
  <meta property="og:site_name" content="Mapica" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(preview.og.title)}" />
  <meta name="twitter:description" content="${escapeHtml(preview.og.description)}" />
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
          <a class="btn btn-secondary" href="${escapeHtml(appStore)}">App Store</a>
          ${playStoreLink}
        </div>
        <p class="hint">Exact stops and local tips unlock inside the app after purchase.</p>
      </div>
    </article>
  </main>
  <script>
    (function () {
      var slug = ${slugJs};
      var routePath = ${routePathJs};
      var pageUrl = ${JSON.stringify(pageUrl)};

      function tryOpenApp() {
        var deepLink = 'mapica://route/' + slug;
        var start = Date.now();
        window.location.href = deepLink;
        setTimeout(function () {
          if (Date.now() - start < 1600) {
            window.location.href = pageUrl;
          }
        }, 1200);
      }

      document.getElementById('open-app')?.addEventListener('click', tryOpenApp);
      document.getElementById('adapt-trip')?.addEventListener('click', tryOpenApp);
    })();
  </script>
</body>
</html>`;
}
