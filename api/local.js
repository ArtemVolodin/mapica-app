"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/storefront.ts
var storefront_exports = {};
__export(storefront_exports, {
  default: () => handler
});
module.exports = __toCommonJS(storefront_exports);

// lib/env.ts
function readEnv(source) {
  const from = source ?? (typeof process !== "undefined" ? process.env : {});
  return {
    SUPABASE_URL: from.SUPABASE_URL,
    SUPABASE_ANON_KEY: from.SUPABASE_ANON_KEY,
    SITE_URL: from.SITE_URL,
    APP_STORE_URL: from.APP_STORE_URL,
    PLAY_STORE_URL: from.PLAY_STORE_URL
  };
}

// lib/fetch-preview.ts
var DEFAULT_SUPABASE_URL = "https://qsstbssltuzglvtrpkvh.supabase.co";
async function supabaseFetch(path, env) {
  const base = (env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const anon = env.SUPABASE_ANON_KEY ?? "";
  if (!anon) {
    throw new Error("SUPABASE_ANON_KEY is not configured");
  }
  return fetch(`${base}${path}`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`
    }
  });
}
async function fetchLocalPreview(slug, env) {
  const res = await supabaseFetch(
    `/functions/v1/local-preview/${encodeURIComponent(slug)}`,
    env
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`local-preview ${res.status}`);
  }
  return await res.json();
}

// lib/cover.ts
var PARIS = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80";
var ITALY = "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1600&q=80";
var TRAVEL = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80";
function coverUrl(preview) {
  if (preview.cover_image_url) return preview.cover_image_url;
  const d = (preview.destination || preview.city || "").toLowerCase();
  if (d.includes("paris")) return PARIS;
  if (d.includes("nice") || d.includes("liguria") || d.includes("italy") || d.includes("cinque")) {
    return ITALY;
  }
  return TRAVEL;
}

// lib/render-local.ts
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function siteUrl(env) {
  return (env.SITE_URL ?? "https://mapica.app").replace(/\/$/, "");
}
function appStoreUrl(env) {
  return env.APP_STORE_URL ?? "https://apps.apple.com/app/mapica";
}
var HEAD_META = `
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#faf8f3" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
`;
var RESERVED = /* @__PURE__ */ new Set([
  "route",
  "routes",
  "privacy",
  "terms",
  "contact",
  "app",
  "apps",
  "local",
  "locals",
  "api",
  "images",
  "styles",
  "home",
  "trip",
  "trips",
  "profile",
  "auth",
  "login",
  "welcome",
  "notifications",
  "l",
  "index",
  "assets",
  "static",
  "www",
  "admin",
  "support",
  "about",
  "blog",
  "help",
  "favicon",
  "robots",
  "sitemap",
  "mapica",
  "null",
  "undefined"
]);
var EXPERTISE_LABELS = {
  hiddenPlaces: "Hidden places",
  localFood: "Food",
  restaurants: "Restaurants",
  architecture: "Architecture",
  history: "History",
  museums: "Museums",
  nature: "Nature",
  sea: "Sea",
  beaches: "Beaches",
  smallTowns: "Small towns",
  familyTrips: "With kids",
  budgetTrips: "Budget travel",
  premiumTrips: "Premium",
  nightlife: "Nightlife",
  carRoutes: "Road trips",
  activeRest: "Active travel",
  calmRest: "Slow travel",
  art: "Art",
  views: "Viewpoints"
};
function isReservedLocalSlug(slug) {
  const key = slug.trim().toLowerCase().replace(/^@/, "");
  return RESERVED.has(key);
}
function countryFlag(countryId) {
  if (!countryId || countryId.length !== 2) return "";
  const cc = countryId.toUpperCase();
  return String.fromCodePoint(
    ...[...cc].map((c) => 127462 + c.charCodeAt(0) - 65)
  );
}
function expertiseLabels(raw) {
  return raw.map((key) => EXPERTISE_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").trim()).filter(Boolean);
}
function taglineFor(preview) {
  const about = (preview.about || "").trim();
  if (about) {
    const first = about.split(/(?<=[.!?])\s+/)[0]?.trim();
    if (first && first.length <= 140) return first;
    if (about.length <= 140) return about;
    return `${about.slice(0, 137).trim()}\u2026`;
  }
  const city = preview.city?.trim();
  if (city) {
    return `Living in ${city} and sharing routes through places I actually love.`;
  }
  return "Routes through places I recommend to friends.";
}
function bioFor(preview) {
  const about = (preview.about || "").trim();
  if (about.length > 0) return about;
  const city = preview.city?.trim() || preview.country_name?.trim() || "this region";
  return `Living in ${city} and exploring it beyond the obvious places. I create slow routes through coastal villages, local markets, viewpoints and places I recommend to friends.`;
}
function regionLine(preview) {
  const regions = (preview.regions ?? []).map((r) => String(r).trim()).filter(Boolean);
  if (regions.length > 0) return regions.slice(0, 4).join(" \xB7 ");
  return preview.city?.trim() || "";
}
function statsLine(preview) {
  const parts = [];
  parts.push(`${preview.route_count} route${preview.route_count === 1 ? "" : "s"}`);
  if (preview.followers_count > 0) {
    parts.push(`${preview.followers_count} follower${preview.followers_count === 1 ? "" : "s"}`);
  }
  if (preview.show_travelers && preview.completed_trips > 0) {
    parts.push(`${preview.completed_trips} traveler${preview.completed_trips === 1 ? "" : "s"}`);
  }
  return parts.join(" \xB7 ");
}
function stars(rating) {
  const full = Math.max(1, Math.min(5, Math.round(rating)));
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}
function reviewByline(review) {
  const name = review.author_name.trim() || "Traveler";
  const city = review.author_city?.trim();
  return city ? `${name} \xB7 ${city}` : name;
}
function reviewCard(review) {
  return `<article class="review-card">
    <p class="review-stars" aria-label="${escapeHtml(String(review.rating))} out of 5">${stars(review.rating)}</p>
    <blockquote class="review-text">"${escapeHtml(review.review_text)}"</blockquote>
    <p class="review-byline">${escapeHtml(reviewByline(review))}</p>
  </article>`;
}
function routeCard(route) {
  const cover = coverUrl({
    cover_image_url: route.cover_image_url,
    destination: route.city || route.country || route.title,
    city: route.city
  });
  const days = `${route.duration_days} day${route.duration_days === 1 ? "" : "s"}`;
  const places = route.place_count > 0 ? `${route.place_count} places` : "";
  const metaParts = [days, places].filter(Boolean);
  if (route.route_reviews_count > 0 && route.route_rating != null) {
    metaParts.push(`\u2605 ${Number(route.route_rating).toFixed(1)}`);
  }
  const meta = metaParts.join(" \xB7 ");
  const subtitle = (route.short_description || route.city || route.country || "").trim();
  const price = `\u20AC${Number(route.price_eur).toFixed(0)}`;
  return `<a class="route-card" href="${escapeHtml(route.public_url)}">
    <div class="route-photo"><img src="${escapeHtml(cover)}" alt="" loading="lazy" width="960" height="640" /></div>
    <div class="route-copy">
      <h3>${escapeHtml(route.title)}</h3>
      ${subtitle ? `<p class="route-sub">${escapeHtml(subtitle)}</p>` : ""}
      <div class="route-foot">
        <span class="route-meta">${escapeHtml(meta)}</span>
        <span class="route-price">${escapeHtml(price)}</span>
      </div>
      <span class="route-cta">View route \u2192</span>
    </div>
  </a>`;
}
function renderLocalNotFound(slug, env = {}) {
  const title = "Creator not found";
  const description = "This Mapica creator page may be unpublished or the link is incorrect.";
  const url = `${siteUrl(env)}/@${encodeURIComponent(slug.replace(/^@/, ""))}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(title)} \xB7 Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  <main class="empty">
    <p class="kicker">Local Creator</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl(env))}">Get the app</a>
  </main>
</body>
</html>`;
}
function renderLocalPage(preview, env = {}) {
  const site = siteUrl(env);
  const handle = preview.handle || preview.slug.split("-")[0];
  const pageUrl = preview.public_url || `${site}/@${encodeURIComponent(handle)}`;
  const name = preview.display_name;
  const tagline = taglineFor(preview);
  const bio = bioFor(preview);
  const description = bio.length > 160 ? `${bio.slice(0, 157)}\u2026` : bio;
  const avatar = preview.avatar_url?.trim() || "";
  const ogImage = preview.og?.image || avatar || `${site}/images/og.jpg`;
  const store = appStoreUrl(env);
  const slugJs = JSON.stringify(preview.slug);
  const handleJs = JSON.stringify(handle);
  const creatorIdJs = JSON.stringify(preview.creator_id);
  const followLabel = preview.is_following ? "Following" : "Follow";
  const followClass = preview.is_following ? "btn btn-outline is-following" : "btn btn-outline";
  const ratingHtml = preview.show_rating && preview.creator_rating != null ? `<p class="creator-rating">\u2605 ${Number(preview.creator_rating).toFixed(1)} \xB7 ${preview.reviews_count} review${preview.reviews_count === 1 ? "" : "s"}</p>` : "";
  const instagram = preview.instagram_url?.trim();
  const instagramHtml = instagram ? `<a class="trust link" href="${escapeHtml(instagram)}" target="_blank" rel="noopener noreferrer">Instagram \u2197</a>` : "";
  const reviewsHtml = preview.reviews?.length > 0 ? preview.reviews.map(reviewCard).join("") : "";
  const flag = countryFlag(preview.country_id);
  const locationParts = [
    preview.city?.trim(),
    preview.country_name?.trim()
  ].filter(Boolean);
  const location = locationParts.join(" \xB7 ");
  const regions = regionLine(preview);
  const specs = expertiseLabels(preview.expertise ?? []);
  const initial = escapeHtml(name.trim() ? name.trim().charAt(0).toUpperCase() : "L");
  const avatarHtml = avatar ? `<img class="hero-photo" src="${escapeHtml(avatar)}" alt="" width="160" height="160" />` : `<div class="hero-photo hero-photo-fallback" aria-hidden="true">${initial}</div>`;
  const routesHtml = preview.routes?.length > 0 ? preview.routes.map(routeCard).join("") : `<p class="empty-routes">No published routes yet. Ask ${escapeHtml(name.split(" ")[0] || name)} for a personal route.</p>`;
  const specsHtml = specs.length ? `<div class="pill-row" aria-label="Specialties">${specs.map((s) => `<span class="pill">${escapeHtml(s)}</span>`).join("")}</div>` : "";
  const ogTitle = preview.og?.title || `${name} \xB7 Local Creator`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(name)} \xB7 Local Creator \xB7 Mapica</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(preview.og?.description || description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="Mapica" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(name)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  <header class="top"><a class="logo" href="/"><img src="/images/app-icon-180.png" width="28" height="28" alt="" /> Mapica</a></header>
  <main class="creator">
    <section class="hero">
      ${avatarHtml}
      <p class="kicker">Local Creator</p>
      <h1>${escapeHtml(name)}</h1>
      ${location ? `<p class="hero-location">${escapeHtml(location)}${flag ? ` ${flag}` : ""}</p>` : ""}
      <p class="tagline">${escapeHtml(tagline)}</p>
      <div class="trust-row">
        ${preview.verified ? '<span class="trust">\u2713 Verified local</span>' : ""}
        ${instagramHtml}
      </div>
      ${ratingHtml}
      ${regions ? `<p class="regions">\u{1F4CD} ${escapeHtml(regions)}</p>` : ""}
      <p class="stats">${escapeHtml(statsLine(preview))}</p>
      <div class="hero-actions">
        <button type="button" class="${followClass}" id="follow-btn" data-following="${preview.is_following ? "1" : "0"}">${escapeHtml(followLabel)}</button>
        <button type="button" class="btn btn-outline btn-icon" id="save-btn" aria-label="Save">\u2661</button>
      </div>
    </section>

    <section class="section" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <p class="bio">${escapeHtml(bio)}</p>
      ${specsHtml}
    </section>

    <section class="section" aria-labelledby="routes-title">
      <h2 id="routes-title">Routes</h2>
      <div class="route-grid">${routesHtml}</div>
    </section>

    ${reviewsHtml ? `<section class="section" aria-labelledby="reviews-title">
      <h2 id="reviews-title">What travelers say</h2>
      <div class="review-grid">${reviewsHtml}</div>
    </section>` : ""}

    <section class="section cta-block" aria-labelledby="trip-title">
      <h2 id="trip-title">Want something made just for you?</h2>
      <p class="cta-lede">A personal route created by ${escapeHtml(name.split(" ")[0] || name)} around your dates, interests and travel style.</p>
      <ul class="checklist">
        <li>\u2713 Made by a local</li>
        <li>\u2713 Delivered within 24 hours</li>
        <li>\u2713 Interactive Mapica route</li>
        <li>\u2713 Restaurants &amp; hidden places included</li>
      </ul>
      <p class="cta-note">Your local builds the route \u2014 they don&apos;t travel with you in person.</p>
      <p class="cta-price">From \u20AC39</p>
      <button type="button" class="btn btn-primary btn-wide" id="create-trip">Create my personal trip</button>
      <a class="btn btn-ghost btn-wide" href="${escapeHtml(store)}">Get the app</a>
    </section>

    <footer class="site-foot">
      <p class="foot-brand">Mapica</p>
      <p class="foot-tag">Travel like you know someone there.</p>
    </footer>
  </main>
  <script>
    (function () {
      var slug = ${slugJs};
      var handle = ${handleJs};
      var creatorId = ${creatorIdJs};
      var store = ${JSON.stringify(store)};
      var supabaseUrl = ${JSON.stringify(env.SUPABASE_URL ?? "https://qsstbssltuzglvtrpkvh.supabase.co")};
      var supabaseAnon = ${JSON.stringify(env.SUPABASE_ANON_KEY ?? "")};

      function openApp(path) {
        var deepLink = 'mapica://' + path.replace(/^\\//, '');
        var start = Date.now();
        window.location.href = deepLink;
        setTimeout(function () {
          if (Date.now() - start < 1600) window.location.href = store;
        }, 1200);
      }

      function authToken() {
        if (!supabaseAnon || !window.localStorage) return null;
        var prefix = 'sb-' + supabaseUrl.replace(/^https?:\\/\\//, '').split('.')[0];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i) || '';
          if (key.indexOf('auth-token') >= 0) {
            try {
              var raw = JSON.parse(localStorage.getItem(key) || '{}');
              return raw.access_token || raw.currentSession?.access_token || null;
            } catch (_) {}
          }
        }
        return null;
      }

      function setFollowState(following, followersCount) {
        var btn = document.getElementById('follow-btn');
        if (!btn) return;
        btn.textContent = following ? 'Following' : 'Follow';
        btn.classList.toggle('is-following', !!following);
        btn.setAttribute('data-following', following ? '1' : '0');
        if (typeof followersCount === 'number') {
          var stats = document.querySelector('.stats');
          if (!stats) return;
          var parts = stats.textContent.split(' \xB7 ').filter(function (p) {
            return p.indexOf('follower') < 0;
          });
          if (followersCount > 0) {
            parts.splice(1, 0, followersCount + ' follower' + (followersCount === 1 ? '' : 's'));
          }
          stats.textContent = parts.join(' \xB7 ');
        }
      }

      document.getElementById('create-trip')?.addEventListener('click', function () {
        openApp('l/' + slug + '?intent=personal-trip');
      });

      document.getElementById('follow-btn')?.addEventListener('click', function () {
        var token = authToken();
        if (!token) {
          openApp('l/' + slug + '?intent=follow');
          return;
        }
        fetch('/api/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ creator_id: creatorId }),
        })
          .then(function (res) {
            if (res.status === 401) {
              openApp('l/' + slug + '?intent=follow');
              return null;
            }
            return res.json();
          })
          .then(function (data) {
            if (data && typeof data.following === 'boolean') {
              setFollowState(data.following, data.followers_count);
            }
          })
          .catch(function () {
            openApp('l/' + slug + '?intent=follow');
          });
      });

      document.getElementById('save-btn')?.addEventListener('click', function () {
        openApp('l/' + slug + '?intent=save');
      });
    })();
  </script>
</body>
</html>`;
}

// api/storefront.ts
function normalizeSlug(raw) {
  return raw.trim().replace(/^@+/, "");
}
async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).end();
    return;
  }
  const slug = normalizeSlug(String(req.query.slug ?? ""));
  if (!slug || slug.length > 120) {
    res.status(404).send("Not found");
    return;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || isReservedLocalSlug(slug)) {
    res.status(404).send("Not found");
    return;
  }
  const env = readEnv(process.env);
  try {
    const preview = await fetchLocalPreview(slug, env);
    const html = preview ? renderLocalPage(preview, env) : renderLocalNotFound(slug, env);
    res.status(preview ? 200 : 404);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", preview ? "index, follow" : "noindex");
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.send(html);
  } catch (error) {
    console.error("local landing error", error);
    res.status(502).send("Preview service unavailable");
  }
}
