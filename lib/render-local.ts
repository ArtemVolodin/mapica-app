import type { SiteEnv } from './env';
import type { LocalPreview, LocalRouteCard } from './types';
import { coverUrl } from './cover';

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

const HEAD_META = `
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
`;

const RESERVED = new Set([
  'route', 'routes', 'privacy', 'terms', 'contact', 'app', 'apps',
  'local', 'locals', 'api', 'images', 'styles', 'home', 'trip', 'trips',
  'profile', 'auth', 'login', 'welcome', 'notifications', 'l', 'index',
  'assets', 'static', 'www', 'admin', 'support', 'about', 'blog', 'help',
  'favicon', 'robots', 'sitemap', 'mapica', 'null', 'undefined',
]);

export function isReservedLocalSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}

export function renderLocalNotFound(slug: string, env: SiteEnv = {}): string {
  const title = 'Local not found';
  const description =
    'This Mapica Local page may be unpublished or the link is incorrect.';
  const url = `${siteUrl(env)}/${encodeURIComponent(slug)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta name="robots" content="noindex" />
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  <main class="empty">
    <p class="kicker">Mapica Local</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl(env))}">Get the app</a>
  </main>
</body>
</html>`;
}

function locationLabel(preview: LocalPreview): string {
  const parts = [preview.city, preview.country_name]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  return parts.join(' · ');
}

function languageLine(preview: LocalPreview): string {
  return (preview.languages ?? [])
    .map((l) => String(l).trim())
    .filter(Boolean)
    .join(' · ');
}

function routeCard(route: LocalRouteCard): string {
  const cover = coverUrl({
    cover_image_url: route.cover_image_url,
    destination: route.city || route.country || route.title,
    city: route.city,
  });
  const days = `${route.duration_days} day${route.duration_days === 1 ? '' : 's'}`;
  const dest = escapeHtml(route.city || route.country || '');
  const price = `€${Number(route.price_eur).toFixed(0)}`;
  const href = escapeHtml(route.public_url);

  return `<a class="route" href="${href}">
    <img src="${escapeHtml(cover)}" alt="" loading="lazy" width="640" height="480" />
    <span class="route-body">
      <span class="route-title">${escapeHtml(route.title)}</span>
      <span class="route-meta">${dest ? `${dest} · ` : ''}${escapeHtml(days)}</span>
      <span class="route-price">${escapeHtml(price)}</span>
    </span>
  </a>`;
}

export function renderLocalPage(preview: LocalPreview, env: SiteEnv = {}): string {
  const site = siteUrl(env);
  const pageUrl = preview.public_url || `${site}/${encodeURIComponent(preview.slug)}`;
  const name = preview.display_name;
  const about = (preview.about || '').trim();
  const description =
    about ||
    preview.og?.description ||
    `Travel routes by ${name}, a Mapica Local.`;
  const location = locationLabel(preview);
  const languages = languageLine(preview);
  const avatar = preview.avatar_url?.trim() || '';
  const ogImage = preview.og?.image || avatar || `${site}/images/og.jpg`;
  const store = appStoreUrl(env);
  const slugJs = JSON.stringify(preview.slug);
  const initial = escapeHtml(
    name.trim() ? name.trim().charAt(0).toUpperCase() : 'L',
  );
  const routesHtml =
    preview.routes?.length > 0
      ? preview.routes.map(routeCard).join('')
      : `<p class="empty-routes">No published routes yet. Order a personal trip in the app.</p>`;

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
  <meta property="og:site_name" content="Mapica" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(preview.og?.title || name)}" />
  <meta name="twitter:description" content="${escapeHtml(preview.og?.description || description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <link rel="stylesheet" href="/styles/local.css" />
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description,
    url: pageUrl,
    image: avatar || undefined,
    jobTitle: 'Mapica Local',
    address: location
      ? { '@type': 'PostalAddress', addressLocality: preview.city, addressCountry: preview.country_name }
      : undefined,
  })}
  </script>
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
      <p class="stats">${preview.route_count} route${preview.route_count === 1 ? '' : 's'} · ${preview.completed_trips} trip${preview.completed_trips === 1 ? '' : 's'}</p>
    </section>
    <section class="routes" aria-labelledby="routes-title">
      <h2 id="routes-title">Routes</h2>
      <div class="route-list">
        ${routesHtml}
      </div>
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
