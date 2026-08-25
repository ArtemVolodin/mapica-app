import type { SiteEnv } from './env';
import type { RoutePreview } from './types';
import { coverUrl } from './cover';
import {
  formatEuro,
  langSwitchHtml,
  localeHome,
  localizedPath,
  routeUi,
  type UiLocale,
} from './ui-locale';

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

function pathFromHref(href: string, fallbackPath: string): string {
  const raw = (href || '').trim();
  if (!raw) return fallbackPath;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname || fallbackPath;
    } catch {
      return fallbackPath;
    }
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function absoluteLocalized(site: string, path: string, locale: UiLocale): string {
  return `${site}${localizedPath(path, locale)}`;
}

function hreflangLinks(enUrl: string, frUrl: string): string {
  return `<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}" />
  <link rel="alternate" hreflang="fr" href="${escapeHtml(frUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}" />`;
}

function topHeader(
  locale: UiLocale,
  enPath: string,
  frPath: string,
  ui: ReturnType<typeof routeUi>,
): string {
  return `<header class="top">
    <a class="logo" href="${escapeHtml(localeHome(locale))}"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a>
    ${langSwitchHtml(enPath, frPath, locale, ui.langNav)}
  </header>`;
}

export function renderNotFound(
  slug: string,
  env: SiteEnv = {},
  locale: UiLocale = 'en',
): string {
  const ui = routeUi(locale);
  const site = siteUrl(env);
  const path = `/route/${encodeURIComponent(slug)}`;
  const pageUrl = absoluteLocalized(site, path, locale);
  const enUrl = absoluteLocalized(site, path, 'en');
  const frUrl = absoluteLocalized(site, path, 'fr');

  return `<!DOCTYPE html>
<html lang="${ui.lang}">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(ui.notFoundTitle)} · Mapica</title>
  <meta name="description" content="${escapeHtml(ui.notFoundDesc)}" />
  <meta property="og:title" content="${escapeHtml(ui.notFoundTitle)}" />
  <meta property="og:description" content="${escapeHtml(ui.notFoundDesc)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  ${hreflangLinks(enUrl, frUrl)}
  <link rel="stylesheet" href="/styles/route.css" />
</head>
<body>
  ${topHeader(locale, localizedPath(path, 'en'), localizedPath(path, 'fr'), ui)}
  <main class="empty">
    <p class="kicker">${escapeHtml(ui.localRoute)}</p>
    <h1>${escapeHtml(ui.notFoundTitle)}</h1>
    <p>${escapeHtml(ui.notFoundDesc)}</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl(env))}">${escapeHtml(ui.getApp)}</a>
  </main>
</body>
</html>`;
}

export function renderLanding(
  preview: RoutePreview,
  env: SiteEnv = {},
  locale: UiLocale = 'en',
): string {
  const ui = routeUi(locale);
  const site = siteUrl(env);
  const cover = coverUrl(preview);
  const fallbackPath = `/route/${encodeURIComponent(preview.slug)}`;
  const basePath = pathFromHref(preview.public_url || '', fallbackPath);
  const pageUrl = absoluteLocalized(site, basePath, locale);
  const enUrl = absoluteLocalized(site, basePath, 'en');
  const frUrl = absoluteLocalized(site, basePath, 'fr');
  const title = preview.title;
  const description = preview.short_description;
  const price = formatEuro(preview.price_eur, locale);
  const daysLabel = ui.day(preview.duration_days);
  const appStore = appStoreUrl(env);
  const dest = escapeHtml(preview.destination);
  const slugJs = JSON.stringify(preview.slug);
  const hero = `<div class="hero"><img src="${escapeHtml(cover)}" alt="${dest}" /></div>`;
  const localHref = preview.local_slug
    ? localizedPath(`/${preview.local_slug}`, locale)
    : '';

  return `<!DOCTYPE html>
<html lang="${ui.lang}">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(title)} · Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(preview.og.title)}" />
  <meta property="og:description" content="${escapeHtml(preview.og.description)}" />
  <meta property="og:image" content="${escapeHtml(cover)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="${escapeHtml(preview.og.type)}" />
  <meta property="og:site_name" content="Mapica" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(preview.og.title)}" />
  <meta name="twitter:description" content="${escapeHtml(preview.og.description)}" />
  <meta name="twitter:image" content="${escapeHtml(cover)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  ${hreflangLinks(enUrl, frUrl)}
  <link rel="stylesheet" href="/styles/route.css" />
</head>
<body>
  ${topHeader(locale, localizedPath(basePath, 'en'), localizedPath(basePath, 'fr'), ui)}
  ${hero}
  <div class="body">
    <p class="kicker">${escapeHtml(ui.localRoute)} · ${dest}</p>
    <div class="title-row">
      <h1>${escapeHtml(title)}</h1>
      <p class="price"><span>${escapeHtml(ui.from)}</span> ${escapeHtml(price)}</p>
    </div>
    <p class="by">${
      localHref
        ? `<a href="${escapeHtml(localHref)}">${escapeHtml(preview.local_display_name)}</a>`
        : escapeHtml(preview.local_display_name)
    }</p>
    <p class="pitch">${escapeHtml(description)}</p>
    <ul class="facts">
      <li>${escapeHtml(daysLabel)}</li>
      <li>${escapeHtml(ui.places(preview.place_count))}</li>
      <li>${preview.walking_km} km</li>
      <li>~${preview.estimated_hours}h</li>
    </ul>
    <p class="hint">${escapeHtml(ui.hint)}</p>
  </div>
  <div class="dock">
    <div class="cta">
      <button type="button" class="btn btn-primary" id="open-app">${escapeHtml(ui.openInMapica)}</button>
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
            window.location.href = ${JSON.stringify(appStore)};
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
