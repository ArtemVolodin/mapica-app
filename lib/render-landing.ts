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
  <header class="top"><a class="logo" href="/">Mapica</a></header>
  <main class="empty">
    <p class="kicker">Local route</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl(env))}">Get the app</a>
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
  const daysLabel = `${preview.duration_days} day${preview.duration_days === 1 ? '' : 's'}`;
  const appStore = appStoreUrl(env);
  const playStore = playStoreUrl(env);
  const cover = preview.cover_image_url;
  const slugJs = JSON.stringify(preview.slug);
  const playStoreLink = playStore
    ? `<a class="btn btn-text" href="${escapeHtml(playStore)}">Google Play</a>`
    : '';
  const hero = cover
    ? `<div class="hero" style="background-image:url('${escapeHtml(cover)}')"></div>`
    : `<div class="hero hero-fallback">${escapeHtml(preview.destination)}</div>`;

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
  <header class="top"><a class="logo" href="/">Mapica</a></header>
  ${hero}
  <div class="body">
    <p class="kicker">Local route · ${escapeHtml(preview.destination)}</p>
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
    <div class="cta">
      <button type="button" class="btn btn-primary" id="open-app">Open in Mapica</button>
      <button type="button" class="btn btn-ghost" id="adapt-trip">Adapt with Mapica</button>
      <a class="btn btn-text" href="${escapeHtml(appStore)}">App Store</a>
      ${playStoreLink}
    </div>
    <p class="hint">Exact stops and local tips unlock in the app after purchase.</p>
  </div>
  <script>
    (function () {
      var slug = ${slugJs};

      function tryOpenApp(path) {
        var deepLink = 'mapica://' + path.replace(/^\//, '');
        var start = Date.now();
        window.location.href = deepLink;
        setTimeout(function () {
          if (Date.now() - start < 1600) {
            window.location.href = ${JSON.stringify(appStore)};
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
