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

// lib/ui-locale.ts
function parseUiLocale(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "fr" || v.startsWith("fr-") ? "fr" : "en";
}
function localeHome(locale) {
  return locale === "fr" ? "/fr/" : "/";
}
function localizedPath(path, locale) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "fr") {
    if (clean === "/" || clean === "") return "/fr/";
    if (clean.startsWith("/fr/") || clean === "/fr") return clean;
    return `/fr${clean}`;
  }
  if (clean === "/fr" || clean === "/fr/") return "/";
  if (clean.startsWith("/fr/")) return clean.slice(3) || "/";
  return clean;
}
function formatEuro(amount, locale) {
  const n = Math.round(Number(amount) || 0);
  if (locale === "fr") {
    return `${new Intl.NumberFormat("fr-FR").format(n)}\xA0\u20AC`;
  }
  return `\u20AC${n}`;
}
var LOCAL_EN = {
  lang: "en",
  langNav: "Language",
  getApp: "Get the app",
  creatorNotFoundTitle: "Creator not found",
  creatorNotFoundDesc: "This Mapica creator page may be unpublished or the link is incorrect.",
  localCreator: "Local Creator",
  verifiedLocal: "\u2713 Verified local",
  about: "About",
  routes: "Routes",
  whatTravelersSay: "What travelers say",
  viewRoute: "View route \u2192",
  follow: "Follow",
  following: "Following",
  save: "Save",
  wantPersonal: "Want something made just for you?",
  personalLede: (firstName) => `A personal route created by ${firstName} around your dates, interests and travel style.`,
  checklistLocal: "\u2713 Made by a local",
  checklist24h: "\u2713 Delivered within 24 hours",
  checklistInteractive: "\u2713 Interactive Mapica route",
  checklistFood: "\u2713 Restaurants & hidden places included",
  ctaNote: "Your local builds the route \u2014 they don't travel with you in person.",
  fromPrice: (price) => `From ${price}`,
  createPersonalTrip: "Create my personal trip",
  emptyRoutes: (firstName) => `No published routes yet. Ask ${firstName} for a personal route.`,
  day: (n) => `${n} day${n === 1 ? "" : "s"}`,
  places: (n) => `${n} places`,
  routeWord: (n) => `${n} route${n === 1 ? "" : "s"}`,
  follower: (n) => `${n} follower${n === 1 ? "" : "s"}`,
  traveler: (n) => `${n} traveler${n === 1 ? "" : "s"}`,
  review: (n) => `${n} review${n === 1 ? "" : "s"}`,
  specialties: "Specialties",
  footTag: "Travel like you know someone there.",
  outOf5: (n) => `${n} out of 5`,
  defaultTraveler: "Traveler",
  fallbackTaglineCity: (city) => `Living in ${city} and sharing routes through places I actually love.`,
  fallbackTagline: "Routes through places I recommend to friends.",
  fallbackBio: (city) => `Living in ${city} and exploring it beyond the obvious places. I create slow routes through coastal villages, local markets, viewpoints and places I recommend to friends.`
};
var LOCAL_FR = {
  lang: "fr",
  langNav: "Langue",
  getApp: "T\xE9l\xE9charger l'app",
  creatorNotFoundTitle: "Cr\xE9ateur introuvable",
  creatorNotFoundDesc: "Cette page cr\xE9ateur Mapica est peut-\xEAtre d\xE9publi\xE9e ou le lien est incorrect.",
  localCreator: "Local Creator",
  verifiedLocal: "\u2713 Local v\xE9rifi\xE9",
  about: "\xC0 propos",
  routes: "Parcours",
  whatTravelersSay: "Ce que disent les voyageurs",
  viewRoute: "Voir le parcours \u2192",
  follow: "Suivre",
  following: "Abonn\xE9",
  save: "Enregistrer",
  wantPersonal: "Envie de quelque chose rien que pour vous\xA0?",
  personalLede: (firstName) => `Un parcours personnalis\xE9 cr\xE9\xE9 par ${firstName} selon vos dates, centres d'int\xE9r\xEAt et fa\xE7on de voyager.`,
  checklistLocal: "\u2713 Cr\xE9\xE9 par un Local",
  checklist24h: "\u2713 Livr\xE9 sous 24 heures",
  checklistInteractive: "\u2713 Parcours interactif Mapica",
  checklistFood: "\u2713 Restaurants et bonnes adresses inclus",
  ctaNote: "Votre Local construit le parcours \u2014 il ne vous accompagne pas physiquement pendant le voyage.",
  fromPrice: (price) => `\xC0 partir de ${price}`,
  createPersonalTrip: "Cr\xE9er mon voyage personnalis\xE9",
  emptyRoutes: (firstName) => `Aucun parcours publi\xE9 pour le moment. Demandez \xE0 ${firstName} un parcours personnalis\xE9.`,
  day: (n) => `${n} jour${n === 1 ? "" : "s"}`,
  places: (n) => `${n} lieu${n === 1 ? "" : "x"}`,
  routeWord: (n) => `${n} parcours`,
  follower: (n) => `${n} abonn\xE9${n === 1 ? "" : "s"}`,
  traveler: (n) => `${n} voyageur${n === 1 ? "" : "s"}`,
  review: (n) => `${n} avis`,
  specialties: "Sp\xE9cialit\xE9s",
  footTag: "Voyagez comme si vous connaissiez quelqu\u2019un sur place.",
  outOf5: (n) => `${n} sur 5`,
  defaultTraveler: "Voyageur",
  fallbackTaglineCity: (city) => `Je vis \xE0 ${city} et je partage des parcours dans des lieux que j\u2019aime vraiment.`,
  fallbackTagline: "Des parcours dans des lieux que je recommande \xE0 mes amis.",
  fallbackBio: (city) => `Je vis \xE0 ${city} et je l\u2019explore au-del\xE0 des lieux \xE9vidents. Je cr\xE9e des parcours tranquilles entre villages c\xF4tiers, march\xE9s locaux, belv\xE9d\xE8res et adresses que je recommande \xE0 mes amis.`
};
function localUi(locale) {
  return locale === "fr" ? LOCAL_FR : LOCAL_EN;
}
function langSwitchHtml(enHref, frHref, locale, ariaLabel) {
  const enCurrent = locale === "en" ? ' aria-current="true"' : "";
  const frCurrent = locale === "fr" ? ' aria-current="true"' : "";
  return `<nav class="lang-switch" aria-label="${ariaLabel}">
      <a href="${enHref}" data-locale="en"${enCurrent}>EN</a>
      <span aria-hidden="true"> \xB7 </span>
      <a href="${frHref}" data-locale="fr"${frCurrent}>FR</a>
    </nav>`;
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
  "undefined",
  "fr",
  "refunds",
  "ops",
  "staff"
]);
var EXPERTISE_LABELS_EN = {
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
var EXPERTISE_LABELS_FR = {
  hiddenPlaces: "Lieux secrets",
  localFood: "Cuisine",
  restaurants: "Restaurants",
  architecture: "Architecture",
  history: "Histoire",
  museums: "Mus\xE9es",
  nature: "Nature",
  sea: "Mer",
  beaches: "Plages",
  smallTowns: "Petites villes",
  familyTrips: "En famille",
  budgetTrips: "Voyage \xE9conomique",
  premiumTrips: "Premium",
  nightlife: "Vie nocturne",
  carRoutes: "Road trips",
  activeRest: "Voyage actif",
  calmRest: "Voyage lent",
  art: "Art",
  views: "Belv\xE9d\xE8res"
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
function expertiseLabels(raw, locale) {
  const map = locale === "fr" ? EXPERTISE_LABELS_FR : EXPERTISE_LABELS_EN;
  return raw.map((key) => map[key] ?? key.replace(/([A-Z])/g, " $1").trim()).filter(Boolean);
}
function pathFromHref(href, fallbackPath) {
  const raw = (href || "").trim();
  if (!raw) return fallbackPath;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname || fallbackPath;
    } catch {
      return fallbackPath;
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}
function absoluteLocalized(site, path, locale) {
  return `${site}${localizedPath(path, locale)}`;
}
function hrefLocalized(href, locale) {
  const raw = (href || "").trim();
  if (!raw) return localizedPath("/", locale);
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      return `${u.origin}${localizedPath(u.pathname, locale)}${u.search}${u.hash}`;
    } catch {
      return raw;
    }
  }
  return localizedPath(raw.startsWith("/") ? raw : `/${raw}`, locale);
}
function taglineFor(preview, ui) {
  const about = (preview.about || "").trim();
  if (about) {
    const first = about.split(/(?<=[.!?])\s+/)[0]?.trim();
    if (first && first.length <= 140) return first;
    if (about.length <= 140) return about;
    return `${about.slice(0, 137).trim()}\u2026`;
  }
  const city = preview.city?.trim();
  if (city) return ui.fallbackTaglineCity(city);
  return ui.fallbackTagline;
}
function bioFor(preview, ui) {
  const about = (preview.about || "").trim();
  if (about.length > 0) return about;
  const city = preview.city?.trim() || preview.country_name?.trim() || "this region";
  return ui.fallbackBio(city);
}
function regionLine(preview) {
  const regions = (preview.regions ?? []).map((r) => String(r).trim()).filter(Boolean);
  if (regions.length > 0) return regions.slice(0, 4).join(" \xB7 ");
  return preview.city?.trim() || "";
}
function statsLine(preview, ui) {
  const parts = [];
  parts.push(ui.routeWord(preview.route_count));
  if (preview.followers_count > 0) {
    parts.push(ui.follower(preview.followers_count));
  }
  if (preview.show_travelers && preview.completed_trips > 0) {
    parts.push(ui.traveler(preview.completed_trips));
  }
  return parts.join(" \xB7 ");
}
function stars(rating) {
  const full = Math.max(1, Math.min(5, Math.round(rating)));
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}
function reviewByline(review, ui) {
  const name = review.author_name.trim() || ui.defaultTraveler;
  const city = review.author_city?.trim();
  return city ? `${name} \xB7 ${city}` : name;
}
function reviewCard(review, ui) {
  return `<article class="review-card">
    <p class="review-stars" aria-label="${escapeHtml(ui.outOf5(review.rating))}">${stars(review.rating)}</p>
    <blockquote class="review-text">"${escapeHtml(review.review_text)}"</blockquote>
    <p class="review-byline">${escapeHtml(reviewByline(review, ui))}</p>
  </article>`;
}
function routeCard(route, locale, ui) {
  const cover = coverUrl({
    cover_image_url: route.cover_image_url,
    destination: route.city || route.country || route.title,
    city: route.city
  });
  const days = ui.day(route.duration_days);
  const places = route.place_count > 0 ? ui.places(route.place_count) : "";
  const metaParts = [days, places].filter(Boolean);
  if (route.route_reviews_count > 0 && route.route_rating != null) {
    metaParts.push(`\u2605 ${Number(route.route_rating).toFixed(1)}`);
  }
  const meta = metaParts.join(" \xB7 ");
  const subtitle = (route.short_description || route.city || route.country || "").trim();
  const price = formatEuro(Number(route.price_eur), locale);
  const href = hrefLocalized(route.public_url, locale);
  return `<a class="route-card" href="${escapeHtml(href)}">
    <div class="route-photo"><img src="${escapeHtml(cover)}" alt="" loading="lazy" width="960" height="640" /></div>
    <div class="route-copy">
      <h3>${escapeHtml(route.title)}</h3>
      ${subtitle ? `<p class="route-sub">${escapeHtml(subtitle)}</p>` : ""}
      <div class="route-foot">
        <span class="route-meta">${escapeHtml(meta)}</span>
        <span class="route-price">${escapeHtml(price)}</span>
      </div>
      <span class="route-cta">${escapeHtml(ui.viewRoute)}</span>
    </div>
  </a>`;
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
function renderLocalNotFound(slug, env = {}, locale = "en") {
  const ui = localUi(locale);
  const site = siteUrl(env);
  const path = `/@${encodeURIComponent(slug.replace(/^@/, ""))}`;
  const pageUrl = absoluteLocalized(site, path, locale);
  const enUrl = absoluteLocalized(site, path, "en");
  const frUrl = absoluteLocalized(site, path, "fr");
  return `<!DOCTYPE html>
<html lang="${ui.lang}">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(ui.creatorNotFoundTitle)} \xB7 Mapica</title>
  <meta name="description" content="${escapeHtml(ui.creatorNotFoundDesc)}" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  ${hreflangLinks(enUrl, frUrl)}
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  ${topHeader(locale, localizedPath(path, "en"), localizedPath(path, "fr"), ui)}
  <main class="empty">
    <p class="kicker">${escapeHtml(ui.localCreator)}</p>
    <h1>${escapeHtml(ui.creatorNotFoundTitle)}</h1>
    <p>${escapeHtml(ui.creatorNotFoundDesc)}</p>
    <a class="btn btn-primary" href="${escapeHtml(appStoreUrl(env))}">${escapeHtml(ui.getApp)}</a>
  </main>
</body>
</html>`;
}
function renderLocalPage(preview, env = {}, locale = "en") {
  const ui = localUi(locale);
  const site = siteUrl(env);
  const handle = preview.handle || preview.slug.split("-")[0];
  const fallbackPath = `/@${encodeURIComponent(handle)}`;
  const basePath = pathFromHref(preview.public_url || "", fallbackPath);
  const pageUrl = absoluteLocalized(site, basePath, locale);
  const enUrl = absoluteLocalized(site, basePath, "en");
  const frUrl = absoluteLocalized(site, basePath, "fr");
  const name = preview.display_name;
  const firstName = name.split(" ")[0] || name;
  const tagline = taglineFor(preview, ui);
  const bio = bioFor(preview, ui);
  const description = bio.length > 160 ? `${bio.slice(0, 157)}\u2026` : bio;
  const avatar = preview.avatar_url?.trim() || "";
  const ogImage = preview.og?.image || avatar || `${site}/images/og.jpg`;
  const store = appStoreUrl(env);
  const slugJs = JSON.stringify(preview.slug);
  const handleJs = JSON.stringify(handle);
  const creatorIdJs = JSON.stringify(preview.creator_id);
  const followLabel = preview.is_following ? ui.following : ui.follow;
  const followClass = preview.is_following ? "btn btn-outline is-following" : "btn btn-primary";
  const ratingHtml = preview.show_rating && preview.creator_rating != null ? `<p class="creator-rating">\u2605 ${Number(preview.creator_rating).toFixed(1)} \xB7 ${escapeHtml(ui.review(preview.reviews_count))}</p>` : "";
  const instagram = preview.instagram_url?.trim();
  const instagramHtml = instagram ? `<a class="trust link" href="${escapeHtml(instagram)}" target="_blank" rel="noopener noreferrer">Instagram \u2197</a>` : "";
  const reviewsHtml = preview.reviews?.length > 0 ? preview.reviews.map((r) => reviewCard(r, ui)).join("") : "";
  const flag = countryFlag(preview.country_id);
  const locationParts = [
    preview.city?.trim(),
    preview.country_name?.trim()
  ].filter(Boolean);
  const location = locationParts.join(" \xB7 ");
  const regions = regionLine(preview);
  const specs = expertiseLabels(preview.expertise ?? [], locale);
  const initial = escapeHtml(name.trim() ? name.trim().charAt(0).toUpperCase() : "L");
  const personalPrice = formatEuro(39, locale);
  const followerNeedle = locale === "fr" ? "abonn\xE9" : "follower";
  const avatarHtml = avatar ? `<img class="hero-photo" src="${escapeHtml(avatar)}" alt="" width="160" height="160" />` : `<div class="hero-photo hero-photo-fallback" aria-hidden="true">${initial}</div>`;
  const routesHtml = preview.routes?.length > 0 ? preview.routes.map((r) => routeCard(r, locale, ui)).join("") : `<p class="empty-routes">${escapeHtml(ui.emptyRoutes(firstName))}</p>`;
  const specsHtml = specs.length ? `<div class="pill-row" aria-label="${escapeHtml(ui.specialties)}">${specs.map((s) => `<span class="pill">${escapeHtml(s)}</span>`).join("")}</div>` : "";
  const ogTitle = preview.og?.title || `${name} \xB7 ${ui.localCreator}`;
  return `<!DOCTYPE html>
<html lang="${ui.lang}">
<head>
  <meta charset="utf-8" />
  ${HEAD_META}
  <title>${escapeHtml(name)} \xB7 ${escapeHtml(ui.localCreator)} \xB7 Mapica</title>
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
  ${hreflangLinks(enUrl, frUrl)}
  <link rel="stylesheet" href="/styles/local.css" />
</head>
<body>
  ${topHeader(locale, localizedPath(basePath, "en"), localizedPath(basePath, "fr"), ui)}
  <main class="creator">
    <section class="hero">
      ${avatarHtml}
      <p class="kicker">${escapeHtml(ui.localCreator)}</p>
      <h1>${escapeHtml(name)}</h1>
      ${location ? `<p class="hero-location">${escapeHtml(location)}${flag ? ` ${flag}` : ""}</p>` : ""}
      <p class="tagline">${escapeHtml(tagline)}</p>
      <div class="trust-row">
        ${preview.verified ? `<span class="trust">${escapeHtml(ui.verifiedLocal)}</span>` : ""}
        ${instagramHtml}
      </div>
      ${ratingHtml}
      ${regions ? `<p class="regions">\u{1F4CD} ${escapeHtml(regions)}</p>` : ""}
      <p class="stats">${escapeHtml(statsLine(preview, ui))}</p>
      <div class="hero-actions">
        <button type="button" class="${followClass}" id="follow-btn" data-following="${preview.is_following ? "1" : "0"}">${escapeHtml(followLabel)}</button>
        <button type="button" class="btn btn-outline btn-icon" id="save-btn" aria-label="${escapeHtml(ui.save)}">\u2661</button>
      </div>
    </section>

    <section class="section" aria-labelledby="about-title">
      <h2 id="about-title">${escapeHtml(ui.about)}</h2>
      <p class="bio">${escapeHtml(bio)}</p>
      ${specsHtml}
    </section>

    <section class="section" aria-labelledby="routes-title">
      <h2 id="routes-title">${escapeHtml(ui.routes)}</h2>
      <div class="route-grid">${routesHtml}</div>
    </section>

    ${reviewsHtml ? `<section class="section" aria-labelledby="reviews-title">
      <h2 id="reviews-title">${escapeHtml(ui.whatTravelersSay)}</h2>
      <div class="review-grid">${reviewsHtml}</div>
    </section>` : ""}

    <section class="section cta-block" aria-labelledby="trip-title">
      <h2 id="trip-title">${escapeHtml(ui.wantPersonal)}</h2>
      <p class="cta-lede">${escapeHtml(ui.personalLede(firstName))}</p>
      <ul class="checklist">
        <li>${escapeHtml(ui.checklistLocal)}</li>
        <li>${escapeHtml(ui.checklist24h)}</li>
        <li>${escapeHtml(ui.checklistInteractive)}</li>
        <li>${escapeHtml(ui.checklistFood)}</li>
      </ul>
      <p class="cta-note">${escapeHtml(ui.ctaNote)}</p>
      <p class="cta-price">${escapeHtml(ui.fromPrice(personalPrice))}</p>
      <button type="button" class="btn btn-primary btn-wide" id="create-trip">${escapeHtml(ui.createPersonalTrip)}</button>
      <a class="btn btn-ghost btn-wide" href="${escapeHtml(store)}">${escapeHtml(ui.getApp)}</a>
    </section>

    <footer class="site-foot">
      <p class="foot-brand">Mapica</p>
      <p class="foot-tag">${escapeHtml(ui.footTag)}</p>
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
      var followText = ${JSON.stringify(ui.follow)};
      var followingText = ${JSON.stringify(ui.following)};
      var followerNeedle = ${JSON.stringify(followerNeedle)};

      function followerPhrase(n) {
        ${locale === "fr" ? "return n + ' abonn\xE9' + (n === 1 ? '' : 's');" : "return n + ' follower' + (n === 1 ? '' : 's');"}
      }

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
        btn.textContent = following ? followingText : followText;
        btn.classList.toggle('is-following', !!following);
        btn.classList.toggle('btn-primary', !following);
        btn.classList.toggle('btn-outline', !!following);
        btn.setAttribute('data-following', following ? '1' : '0');
        if (typeof followersCount === 'number') {
          var stats = document.querySelector('.stats');
          if (!stats) return;
          var parts = stats.textContent.split(' \xB7 ').filter(function (p) {
            return p.indexOf(followerNeedle) < 0;
          });
          if (followersCount > 0) {
            parts.splice(1, 0, followerPhrase(followersCount));
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
  const locale = parseUiLocale(req.query.lang);
  const env = readEnv(process.env);
  try {
    const preview = await fetchLocalPreview(slug, env);
    const html = preview ? renderLocalPage(preview, env, locale) : renderLocalNotFound(slug, env, locale);
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
