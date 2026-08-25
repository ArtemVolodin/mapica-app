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
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
`;

const ROUTE_UI = {
  en: {
    lang: 'en',
    langNav: 'Language',
    getApp: 'Get the app',
    notFoundTitle: 'Route not found',
    notFoundDesc: 'This Mapica route may have been unpublished or the link is incorrect.',
    localRoute: 'Local route',
    from: 'from',
    places: (n) => `${n} places`,
    day: (n) => `${n} day${n === 1 ? '' : 's'}`,
    hint: 'Exact stops and local tips unlock in the app after purchase.',
    openInMapica: 'Open in Mapica',
  },
  fr: {
    lang: 'fr',
    langNav: 'Langue',
    getApp: "Télécharger l'app",
    notFoundTitle: 'Parcours introuvable',
    notFoundDesc:
      'Ce parcours Mapica a peut-être été dépublié ou le lien est incorrect.',
    localRoute: 'Parcours Local',
    from: 'à partir de',
    places: (n) => `${n} lieu${n === 1 ? '' : 'x'}`,
    day: (n) => `${n} jour${n === 1 ? '' : 's'}`,
    hint: "Les étapes précises et les conseils du Local se débloquent dans l'app après l'achat.",
    openInMapica: 'Ouvrir dans Mapica',
  },
};

function parseUiLocale(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return v === 'fr' || v.startsWith('fr-') ? 'fr' : 'en';
}

function localeHome(locale) {
  return locale === 'fr' ? '/fr/' : '/';
}

function localizedPath(path, locale) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'fr') {
    if (clean === '/' || clean === '') return '/fr/';
    if (clean.startsWith('/fr/') || clean === '/fr') return clean;
    return `/fr${clean}`;
  }
  if (clean === '/fr' || clean === '/fr/') return '/';
  if (clean.startsWith('/fr/')) return clean.slice(3) || '/';
  return clean;
}

function formatEuro(amount, locale) {
  const n = Math.round(Number(amount) || 0);
  if (locale === 'fr') {
    return `${new Intl.NumberFormat('fr-FR').format(n)}\u00a0€`;
  }
  return `€${n}`;
}

function routeUi(locale) {
  return locale === 'fr' ? ROUTE_UI.fr : ROUTE_UI.en;
}

function langSwitchHtml(enHref, frHref, locale, ariaLabel) {
  const enCurrent = locale === 'en' ? ' aria-current="true"' : '';
  const frCurrent = locale === 'fr' ? ' aria-current="true"' : '';
  return `<nav class="lang-switch" aria-label="${ariaLabel}">
      <a href="${enHref}" data-locale="en"${enCurrent}>EN</a>
      <span aria-hidden="true"> · </span>
      <a href="${frHref}" data-locale="fr"${frCurrent}>FR</a>
    </nav>`;
}

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

function pathFromHref(href, fallbackPath) {
  const raw = String(href || '').trim();
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

function absoluteLocalized(site, path, locale) {
  return `${site}${localizedPath(path, locale)}`;
}

function hreflangLinks(enUrl, frUrl) {
  return `<link rel="alternate" hreflang="en" href="${escapeHtml(enUrl)}" />
  <link rel="alternate" hreflang="fr" href="${escapeHtml(frUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}" />`;
}

function topHeader(locale, enPath, frPath, ui) {
  return `<header class="top">
    <a class="logo" href="${escapeHtml(localeHome(locale))}"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a>
    ${langSwitchHtml(enPath, frPath, locale, ui.langNav)}
  </header>`;
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

function renderNotFound(slug, locale = 'en') {
  const ui = routeUi(locale);
  const site = siteUrl();
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
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl())}">${escapeHtml(ui.getApp)}</a>
  </main>
</body>
</html>`;
}

function renderLanding(preview, locale = 'en') {
  const ui = routeUi(locale);
  const site = siteUrl();
  const cover = coverUrl(preview);
  const title = preview.title;
  const description = preview.short_description;
  const price = formatEuro(preview.price_eur, locale);
  const fallbackPath = `/route/${encodeURIComponent(preview.slug)}`;
  const basePath = pathFromHref(preview.public_url || '', fallbackPath);
  const pageUrl = absoluteLocalized(site, basePath, locale);
  const enUrl = absoluteLocalized(site, basePath, 'en');
  const frUrl = absoluteLocalized(site, basePath, 'fr');
  const ogImage = preview.og?.image || cover;
  const dest = escapeHtml(preview.destination);
  const daysLabel = ui.day(preview.duration_days);
  const slugJs = JSON.stringify(preview.slug);
  const store = appStoreUrl();
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

  const locale = parseUiLocale(req.query.lang);

  try {
    const preview = await fetchPreview(slug);
    const html = preview ? renderLanding(preview, locale) : renderNotFound(slug, locale);
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
};
