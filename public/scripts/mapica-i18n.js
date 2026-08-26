(function (global) {
  'use strict';

  var STORAGE_KEY = 'mapica_locale';
  var BANNER_DISMISSED_KEY = 'mapica_locale_banner_dismissed';

  function normalizeLocale(value) {
    var v = String(value || '').toLowerCase();
    if (v === 'fr' || v.indexOf('fr') === 0) return 'fr';
    if (v === 'ru' || v.indexOf('ru') === 0) return 'ru';
    return 'en';
  }

  function readStorage() {
    try {
      var fromCookie = null;
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim();
        if (p.indexOf(STORAGE_KEY + '=') === 0) {
          fromCookie = decodeURIComponent(p.slice(STORAGE_KEY.length + 1));
          break;
        }
      }
      if (fromCookie === 'en' || fromCookie === 'fr' || fromCookie === 'ru') {
        return fromCookie;
      }
    } catch (e) {}
    try {
      var ls = localStorage.getItem(STORAGE_KEY);
      if (ls === 'en' || ls === 'fr' || ls === 'ru') return ls;
    } catch (e2) {}
    return null;
  }

  function writeStorage(locale) {
    var value = normalizeLocale(locale);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
    try {
      var maxAge = 60 * 60 * 24 * 365;
      document.cookie =
        STORAGE_KEY +
        '=' +
        encodeURIComponent(value) +
        '; path=/; max-age=' +
        maxAge +
        '; SameSite=Lax';
    } catch (e2) {}
  }

  function cleanPathname(pathname) {
    var path = String(pathname || '/');
    if (!path) path = '/';
    if (path.charAt(0) !== '/') path = '/' + path;
    path = path.replace(/\/index\.html$/i, '/');
    path = path.replace(
      /\/(privacy|terms|contact|refunds|creators)\.html$/i,
      function (_, page) {
        return '/' + page.toLowerCase();
      }
    );
    if (path === '/creators' || path === '/creators/') path = '/local';
    if (path === '/fr/creators' || path === '/fr/creators/') path = '/fr/local';
    if (path.length > 1 && path.charAt(path.length - 1) === '/') {
      if (path !== '/fr/' && path !== '/ru/') path = path.slice(0, -1);
    }
    return path || '/';
  }

  function getLocaleFromPath(pathname) {
    var path = cleanPathname(pathname || (global.location && location.pathname) || '/');
    if (path === '/fr' || path === '/fr/' || path.indexOf('/fr/') === 0) return 'fr';
    if (path === '/ru' || path === '/ru/' || path.indexOf('/ru/') === 0) return 'ru';
    return 'en';
  }

  function stripLocalePrefix(pathname) {
    var path = cleanPathname(pathname);
    if (path === '/fr' || path === '/fr/' || path === '/ru' || path === '/ru/') {
      return '/';
    }
    if (path.indexOf('/fr/') === 0) return path.slice(3) || '/';
    if (path.indexOf('/ru/') === 0) return path.slice(3) || '/';
    return path;
  }

  function equivalentPath(pathname, targetLocale) {
    var target = normalizeLocale(targetLocale);
    var base = stripLocalePrefix(pathname);
    var ruLegal = { '/terms': true, '/privacy': true, '/refunds': true };
    var enOnly = { '/open-app': true };
    if (target === 'fr') {
      if (enOnly[base]) return '/fr/';
      if (base === '/') return '/fr/';
      return '/fr' + base;
    }
    if (target === 'ru') {
      if (ruLegal[base]) return '/ru' + base;
      return '/';
    }
    if (enOnly[base]) return base;
    return base === '/' ? '/' : base;
  }

  function setPreference(locale) {
    writeStorage(normalizeLocale(locale));
  }

  function switchLocale(targetLocale) {
    var target = normalizeLocale(targetLocale);
    setPreference(target);
    var next = equivalentPath(
      (global.location && location.pathname) || '/',
      target
    );
    var search = (global.location && location.search) || '';
    var hash = (global.location && location.hash) || '';
    if (global.location) {
      location.assign(next + search + hash);
    }
    return next;
  }

  function isHomePath(pathname) {
    var path = cleanPathname(pathname);
    return path === '/' || path === '/fr' || path === '/fr/';
  }

  function shouldShowBanner() {
    if (!isHomePath((global.location && location.pathname) || '/')) return false;
    if (readStorage()) return false;
    try {
      if (sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1') return false;
    } catch (e) {}
    var lang = '';
    try {
      lang = String(navigator.language || (navigator.languages && navigator.languages[0]) || '');
    } catch (e2) {}
    return lang.toLowerCase().indexOf('fr') === 0;
  }

  function dismissBanner() {
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch (e) {}
    var el = document.getElementById('mapica-locale-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showBanner() {
    if (!shouldShowBanner()) return;
    if (document.getElementById('mapica-locale-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'mapica-locale-banner';
    banner.className = 'locale-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Language');
    banner.innerHTML =
      '<p class="locale-banner-text">Continuer en français&nbsp;?</p>' +
      '<div class="locale-banner-actions">' +
      '<button type="button" class="locale-banner-yes">Français</button>' +
      '<button type="button" class="locale-banner-no">English</button>' +
      '<button type="button" class="locale-banner-close" aria-label="Close">×</button>' +
      '</div>';

    banner.querySelector('.locale-banner-yes').addEventListener('click', function () {
      dismissBanner();
      switchLocale('fr');
    });
    banner.querySelector('.locale-banner-no').addEventListener('click', function () {
      setPreference('en');
      dismissBanner();
    });
    banner.querySelector('.locale-banner-close').addEventListener('click', function () {
      dismissBanner();
    });

    var nav = document.getElementById('nav');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(banner, nav.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  function wireLangSwitches() {
    document.querySelectorAll('.lang-switch a[data-locale]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var locale = a.getAttribute('data-locale');
        if (!locale) return;
        e.preventDefault();
        switchLocale(locale);
      });
    });
  }

  function init() {
    wireLangSwitches();
    showBanner();
  }

  var MapicaI18n = {
    STORAGE_KEY: STORAGE_KEY,
    getLocaleFromPath: getLocaleFromPath,
    setPreference: setPreference,
    switchLocale: switchLocale,
    equivalentPath: equivalentPath,
    getPreference: readStorage,
    init: init
  };

  global.MapicaI18n = MapicaI18n;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
