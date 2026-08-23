(function () {
  // Mirrors lib/core/services/trip_pricing_service.dart (routeListingCommissionRate + base splits).
  var CONFIG = {
    appStore: 'https://apps.apple.com/app/mapica',
    exampleProfile: 'https://mapica.app/@artem',
    routeCommissionRate: 0.2,
    personalTrip: { price: 39, localPayout: 30, mapicaRevenue: 9 },
    routeExamplePrice: 12,
    freeToJoin: true,
    applyPath: '/local/apply',
  };

  function applyUrl(source) {
    var url = CONFIG.applyPath + '?source=' + encodeURIComponent(source || 'become_local');
    return url;
  }

  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  }

  function formatMoney(n) {
    return '€' + n.toFixed(2).replace(/\.00$/, '');
  }

  function routeSplit(price) {
    var mapica = price * CONFIG.routeCommissionRate;
    return { local: price - mapica, mapica: mapica };
  }

  function paintMoneyExamples() {
    var route = routeSplit(CONFIG.routeExamplePrice);
    var routePrice = document.getElementById('money-route-price');
    var routeLocal = document.getElementById('money-route-local');
    var routeMapica = document.getElementById('money-route-mapica');
    if (routePrice) routePrice.textContent = formatMoney(CONFIG.routeExamplePrice);
    if (routeLocal) routeLocal.textContent = formatMoney(route.local);
    if (routeMapica) routeMapica.textContent = formatMoney(route.mapica);

    var pt = CONFIG.personalTrip;
    var tripPrice = document.getElementById('money-trip-price');
    var tripLocal = document.getElementById('money-trip-local');
    var tripMapica = document.getElementById('money-trip-mapica');
    if (tripPrice) tripPrice.textContent = formatMoney(pt.price);
    if (tripLocal) tripLocal.textContent = formatMoney(pt.localPayout);
    if (tripMapica) tripMapica.textContent = formatMoney(pt.mapicaRevenue);
  }

  var modalRoot = null;

  function ensureModal() {
    if (modalRoot) return modalRoot;
    modalRoot = document.createElement('div');
    modalRoot.className = 'local-modal-root';
    modalRoot.hidden = true;
    modalRoot.innerHTML =
      '<button class="local-modal-backdrop" type="button" aria-label="Close"></button>' +
      '<div class="local-modal" role="dialog" aria-modal="true" aria-labelledby="local-modal-title">' +
      '<button class="local-modal-close" type="button" aria-label="Close"><span aria-hidden="true">×</span></button>' +
      '<h2 id="local-modal-title">Create your Local profile in Mapica</h2>' +
      '<p class="local-modal-lede">Scan with your iPhone to open Mapica and start as a Local.</p>' +
      '<img class="local-modal-qr" id="local-modal-qr" width="200" height="200" alt="" />' +
      '<a class="btn btn-primary local-modal-store" id="local-modal-store" href="' +
      CONFIG.appStore +
      '">Download on the App Store</a>' +
      '</div>';
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener('click', function (e) {
      if (e.target.closest('.local-modal-backdrop') || e.target.closest('.local-modal-close')) {
        closeModal();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
    return modalRoot;
  }

  function openModal(source) {
    var root = ensureModal();
    var target = new URL(applyUrl(source), window.location.origin).href;
    var qr = root.querySelector('#local-modal-qr');
    if (qr) {
      qr.src =
        'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' +
        encodeURIComponent(target);
      qr.alt = 'QR code to open Mapica Local onboarding';
    }
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    root.querySelector('.local-modal-close')?.focus();
  }

  function closeModal() {
    if (!modalRoot || modalRoot.hidden) return;
    modalRoot.hidden = true;
    document.body.style.overflow = '';
  }

  function openBecomeLocal(source, location) {
    if (location && typeof window.__mapicaTrack === 'function') {
      window.__mapicaTrack('local_cta_click', { location: location, source: source || 'become_local' });
    }

    if (isMobile() && isIOS()) {
      var deep = applyUrl(source);
      var start = Date.now();
      window.location.href = deep;
      setTimeout(function () {
        if (Date.now() - start < 1600) window.location.href = CONFIG.appStore;
      }, 1200);
      return;
    }

    if (isMobile()) {
      window.location.href = CONFIG.appStore;
      return;
    }

    openModal(source);
  }

  function wireCtas() {
    document.querySelectorAll('[data-local-cta]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openBecomeLocal(el.getAttribute('data-source'), el.getAttribute('data-location'));
      });
    });

    document.querySelectorAll('[data-profile-link]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (typeof window.__mapicaTrack === 'function') {
          window.__mapicaTrack('local_profile_example_click', {
            location: el.getAttribute('data-location') || 'unknown',
          });
        }
      });
    });
  }

  function wireFaq() {
    document.querySelectorAll('.local-faq-item').forEach(function (item) {
      var btn = item.querySelector('.local-faq-q');
      var panel = item.querySelector('.local-faq-a');
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && typeof window.__mapicaTrack === 'function') {
          window.__mapicaTrack('local_faq_open', { question: btn.textContent.trim() });
        }
      });
    });
  }

  function wireNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    function onScroll() {
      nav.classList.toggle('is-stuck', window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  paintMoneyExamples();
  wireCtas();
  wireFaq();
  wireNav();

  if (typeof window.__mapicaTrack === 'function') {
    window.__mapicaTrack('local_landing_view', { page: '/local' });
  }
})();
