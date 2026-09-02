/* MAPICA OPS — staff console. Auth + RLS + RPCs are the security boundary. */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('#app');
  let sb = null;
  let session = null;
  let staff = null;
  let idleTimer = null;
  let flash = '';
  let renderSeq = 0;
  let bound = false;
  let openAlerts = 0;
  let lastExportPayload = null;
  const IDLE_MS = 8 * 60 * 60 * 1000;
  const ICO = {
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    trips: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h13l5 5v5H3z"/><path d="M16 7v5h5"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>',
    locals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l2 2 4-4"/></svg>',
    alerts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/><path d="M12 3a6 6 0 0 1 6 6c0 7 1 8 1 8H5s1-1 1-8a6 6 0 0 1 6-6"/></svg>',
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>',
    staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="6.01" y2="15"/><line x1="10" y1="15" x2="14" y2="15"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="m18.4 5.6-2.8 2.8"/><path d="m8.4 15.6-2.8 2.8"/></svg>',
  };

  const routes = [
    [/^\/ops\/?$/, 'overview'],
    [/^\/ops\/personal-trips\/?$/, 'trips'],
    [/^\/ops\/personal-trips\/([^/]+)\/?$/, 'trip'],
    [/^\/ops\/locals\/?$/, 'locals'],
    [/^\/ops\/locals\/([^/]+)\/?$/, 'local'],
    [/^\/ops\/local-applications\/?$/, 'apps'],
    [/^\/ops\/local-applications\/([^/]+)\/?$/, 'app'],
    [/^\/ops\/finance\/?$/, 'finance'],
    [/^\/ops\/alerts\/?$/, 'alerts'],
    [/^\/ops\/audit\/?$/, 'audit'],
    [/^\/ops\/staff\/?$/, 'staff'],
  ];

  function path() {
    const p = location.pathname.replace(/\/+$/, '') || '/ops';
    return p.startsWith('/ops') ? p : '/ops';
  }

  function hrefPath(href) {
    try {
      return new URL(href, location.origin).pathname.replace(/\/+$/, '') || '/ops';
    } catch {
      return '/ops';
    }
  }

  function navItemIsActive(href) {
    const p = path();
    const h = hrefPath(href);
    if (h === '/ops') return p === '/ops';
    if (h === '/ops/locals') return p === '/ops/locals' || p.startsWith('/ops/locals/');
    if (h === '/ops/local-applications') return p.includes('/local-applications');
    if (h === '/ops/finance') return p === '/ops/finance';
    return p === h || p.startsWith(`${h}/`);
  }

  function paintNav() {
    document.querySelectorAll('.nav a[href^="/ops"]').forEach((a) => {
      a.classList.toggle('active', navItemIsActive(a.getAttribute('href')));
    });
  }

  function initials(email) {
    const local = String(email || 'S').split('@')[0];
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  function displayName(email) {
    const local = String(email || '').split('@')[0] || 'Staff';
    return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function relTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    const sec = Math.round((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 48) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 14) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  function humanReason(reason) {
    if (!reason) return 'Needs review';
    return String(reason).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function priorityBadge(p) {
    const raw = String(p || 'normal').toLowerCase();
    const cls = raw === 'urgent' || raw === 'high' ? `prio-${raw === 'urgent' ? 'urgent' : 'high'}`
      : raw === 'low' ? 'prio-low' : 'prio-medium';
    const label = raw === 'urgent' ? 'Urgent' : raw === 'high' ? 'High' : raw === 'low' ? 'Low' : 'Medium';
    return `<span class="ops-badge ${cls}">${esc(label)}</span>`;
  }

  function pageHeader(title, sub, actionsHtml = '') {
    return `<div class="ops-page-header">
      <div>
        <h1>${esc(title)}</h1>
        <p class="sub">${esc(sub || '')}</p>
      </div>
      ${actionsHtml ? `<div class="ops-page-actions">${actionsHtml}</div>` : ''}
    </div>`;
  }

  function emptyState(title, body) {
    return `<div class="ops-empty"><strong>${esc(title)}</strong>${esc(body || '')}</div>`;
  }

  function kpiCard({ value, label, tone, href, delta, icon }) {
    const tag = href ? 'a' : 'div';
    const hrefAttr = href ? ` href="${esc(href)}"` : '';
    return `<${tag} class="kpi-card kpi-${esc(tone)}"${hrefAttr}>
      ${icon ? `<span class="kpi-ico" aria-hidden="true">${icon}</span>` : ''}
      <div class="n">${esc(value ?? 0)}</div>
      <div class="l">${esc(label)}</div>
      ${delta ? `<div class="d ${esc(delta.cls || '')}">${esc(delta.text)}</div>` : ''}
    </${tag}>`;
  }

  function activityIcon(action) {
    const a = String(action || '').toLowerCase();
    if (a.includes('application') || a.includes('approve') || a.includes('decline')) return ICO.apps;
    if (a.includes('alert') || a.includes('ack')) return ICO.alerts;
    if (a.includes('assign') || a.includes('offer') || a.includes('local')) return ICO.locals;
    if (a.includes('payment') || a.includes('paid')) return ICO.trips;
    return ICO.audit;
  }

  function activityTitle(action) {
    const map = {
      approve_local_application: 'Application approved',
      decline_local_application: 'Application declined',
      request_info_local_application: 'More info requested',
      offer_to_local: 'Local offered',
      assign_local: 'Local assigned',
      assign_to_me: 'Self-assigned',
      reassign_local: 'Local reassigned',
      set_priority: 'Priority updated',
      set_owner: 'Owner assigned',
      mark_unavailable: 'Trip unavailable',
      add_note: 'Note added',
      ack_alert: 'Alert acknowledged',
      upsert_staff: 'Staff updated',
    };
    return map[action] || humanReason(action || 'Ops event');
  }

  function go(href, replace) {
    history[replace ? 'replaceState' : 'pushState']({}, '', href);
    paintNav();
    const main = $('.main');
    if (main) main.innerHTML = '<p class="boot">Loading…</p>';
    render();
  }

  function pill(status) {
    const map = {
      requested: ['st-wait', 'Matching'],
      matching: ['st-wait', 'Matching'],
      offered: ['st-wait', 'Waiting'],
      submitted: ['st-wait', 'Matching'],
      ops_review: ['st-attn', 'Needs attention'],
      local_confirmed: ['st-ok', 'Local confirmed'],
      awaiting_payment: ['st-wait', 'Awaiting payment'],
      paid: ['st-wait', 'Paid'],
      planning: ['st-wait', 'In progress'],
      reviewing: ['st-wait', 'In progress'],
      ready: ['st-ok', 'Completed'],
      completed: ['st-ok', 'Completed'],
      cancelled: ['st-mute', 'Cancelled'],
      unavailable: ['st-bad', 'Unavailable'],
      open: ['st-attn', 'Open'],
      acknowledged: ['st-wait', 'Acknowledged'],
      resolved: ['st-ok', 'Resolved'],
    };
    const [cls, label] = map[status] || ['st-mute', status || '—'];
    return `<span class="pill ${cls}">${esc(label)}</span>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmt(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  function moneyCents(cents, currency = 'EUR') {
    const n = Number(cents) || 0;
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: String(currency || 'EUR').toUpperCase(),
        minimumFractionDigits: 2,
      }).format(n / 100);
    } catch {
      return `€${(n / 100).toFixed(2)}`;
    }
  }

  function productTypeLabel(type) {
    if (type === 'ready_route') return 'Ready Route';
    if (type === 'personal_trip') return 'Custom Trip';
    return type || '—';
  }

  function remaining(due) {
    if (!due) return 'N/A';
    const ms = new Date(due).getTime() - Date.now();
    if (ms < 0) return 'Overdue';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  function canAccessFinance(role) {
    return role === 'ops_manager' || role === 'admin';
  }

  function layout(body) {
    const role = staff?.role || '';
    const email = session?.user?.email || '';
    const nav = (href, label, icon, badge) => {
      const active = navItemIsActive(href) ? ' active' : '';
      const badgeHtml = badge
        ? `<span class="nav-badge" aria-label="${esc(badge)} open alerts">${esc(badge)}</span>`
        : '';
      return `<a class="nav-link${active}" href="${href}"><span class="nav-ico" aria-hidden="true">${icon}</span><span>${label}</span>${badgeHtml}</a>`;
    };
    return `<div class="app">
      <nav class="nav" aria-label="Ops navigation">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">${ICO.mark}</span>
          <span>MAPICA OPS</span>
        </div>
        ${nav('/ops', 'Overview', ICO.overview)}
        ${nav('/ops/personal-trips', 'Personal Trips', ICO.trips)}
        ${nav('/ops/locals', 'Locals', ICO.locals)}
        ${nav('/ops/local-applications', 'Applications', ICO.apps)}
        ${nav('/ops/alerts', 'Alerts', ICO.alerts, openAlerts > 0 ? openAlerts : null)}
        ${canAccessFinance(role) ? nav('/ops/finance', 'Finance', ICO.finance) : ''}
        ${nav('/ops/audit', 'Audit', ICO.audit)}
        ${role === 'admin' ? nav('/ops/staff', 'Staff', ICO.staff) : ''}
        <div class="grow"></div>
        <div class="nav-profile">
          <div class="nav-profile-row">
            <div class="nav-avatar" aria-hidden="true">${esc(initials(email))}</div>
            <div class="nav-profile-meta">
              <div class="nav-profile-name" title="${esc(email)}">${esc(displayName(email))}</div>
              <div class="nav-profile-role">${esc(role || 'staff')}</div>
            </div>
          </div>
          <button type="button" class="nav-logout" id="logout">${ICO.logout}<span>Log out</span></button>
        </div>
      </nav>
      <main class="main">${body}</main>
    </div>`;
  }

  /** Same-origin /ops paths only — blocks open redirects. */
  function safeOpsReturnPath(raw) {
    if (!raw || typeof raw !== 'string') return '/ops';
    const trimmed = raw.trim();
    if (!trimmed.startsWith('/')) return '/ops';
    if (trimmed.startsWith('//')) return '/ops';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return '/ops';
    if (!trimmed.startsWith('/ops')) return '/ops';
    try {
      const u = new URL(trimmed, window.location.origin);
      if (u.origin !== window.location.origin) return '/ops';
      if (!u.pathname.startsWith('/ops')) return '/ops';
      return u.pathname + u.search;
    } catch {
      return '/ops';
    }
  }

  function rememberReturnPath(candidate) {
    const next = safeOpsReturnPath(candidate || (location.pathname + location.search));
    if (next === '/ops') return;
    try {
      const u = new URL(next, window.location.origin);
      // Never persist OAuth callback query as a return target.
      u.searchParams.delete('code');
      u.searchParams.delete('state');
      u.searchParams.delete('error');
      u.searchParams.delete('error_description');
      const cleaned = u.pathname + (u.searchParams.toString() ? `?${u.searchParams}` : '');
      if (!cleaned.startsWith('/ops') || cleaned === '/ops') return;
      sessionStorage.setItem('ops_next', cleaned);
    } catch {
      /* ignore */
    }
  }

  function takeReturnPath() {
    const next = safeOpsReturnPath(sessionStorage.getItem('ops_next') || '/ops');
    sessionStorage.removeItem('ops_next');
    return next;
  }

  function oauthRedirectTo() {
    return `${window.location.origin}/ops`;
  }

  async function initClient() {
    const cfg = await fetch('/api/ops-config', { credentials: 'same-origin' }).then((r) => r.json());
    if (!cfg.anonKey || !window.supabase) throw new Error('Ops config unavailable');
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        session = null;
        staff = null;
      }
    });
  }

  async function loadStaff() {
    const { data: { session: s } } = await sb.auth.getSession();
    session = s;
    if (!s) { staff = null; return; }
    if (staff && staff.user_id === s.user.id && staff.active === true) {
      bumpIdle();
      return;
    }
    // Authorization: staff_users row for auth.uid(), active=true. Email/domain never grants access.
    const { data, error } = await sb.from('staff_users').select('user_id, role, active').eq('user_id', s.user.id).maybeSingle();
    if (error || !data || data.active !== true) {
      staff = null;
      return;
    }
    staff = data;
    bumpIdle();
    // UMD supabase-js rpc() is thenable but has no .catch (Safari throws).
    try {
      await sb.rpc('ops_touch_login');
    } catch {
      /* last-login stamp is best-effort */
    }
  }

  function bumpIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => sb.auth.signOut().then(() => {
      session = null;
      staff = null;
      go('/ops', true);
    }), IDLE_MS);
  }

  function googleMark() {
    return `<svg class="google-mark" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`;
  }

  function loginView(err) {
    return `<div class="login">
      <div class="brand" style="margin:0 0 14px">
        <span class="brand-mark" aria-hidden="true">${ICO.mark}</span>
        <span>MAPICA OPS</span>
      </div>
      <h1>Secure staff access</h1>
      <p class="sub">Access is restricted to authorized Mapica staff.</p>
      <button type="button" class="btn google" id="google-login" aria-label="Continue with Google">
        ${googleMark()}<span>Continue with Google</span>
      </button>
      <div class="or" role="separator"><span>or</span></div>
      <form id="login-form">
        <label for="ops-email">Email</label>
        <input id="ops-email" name="email" type="email" autocomplete="username" required />
        <label for="ops-password">Password</label>
        <input id="ops-password" name="password" type="password" autocomplete="current-password" required />
        <div style="height:14px"></div>
        <button class="btn" type="submit">Sign in</button>
        ${err ? `<div class="err" role="alert">${esc(err)}</div>` : ''}
      </form>
    </div>`;
  }

  function denied() {
    return `<div class="denied">
      <h1>Access restricted</h1>
      <p class="sub">This account is not authorized for Mapica Ops.</p>
      <button class="btn secondary" id="logout">Sign out</button>
    </div>`;
  }

  async function startGoogleLogin(btn) {
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }
    rememberReturnPath(sessionStorage.getItem('ops_next') || (location.pathname + location.search));
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: oauthRedirectTo(),
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
      app.innerHTML = loginView(error.message || String(error));
      bindOnce();
    }
  }

  async function finishAuthNavigation() {
    const params = new URLSearchParams(location.search);
    const hadOAuthReturn = params.has('code') || params.has('error')
      || location.hash.includes('access_token')
      || location.hash.includes('error');
    if (params.get('error') || (location.hash && /error=/.test(location.hash))) {
      const desc = params.get('error_description') || params.get('error') || 'Google sign-in was cancelled.';
      history.replaceState({}, '', '/ops');
      app.innerHTML = loginView(desc);
      bindOnce();
      return true;
    }
    if (!hadOAuthReturn) return false;
    const next = takeReturnPath();
    history.replaceState({}, '', next);
    return false;
  }

  async function overview() {
    const { data, error } = await sb.rpc('ops_overview_stats');
    const s = data || {};
    const { data: attn } = await sb.from('trips')
      .select('id, status, ops_reason, created_at, request_id, ops_priority')
      .eq('status', 'ops_review')
      .order('created_at', { ascending: true })
      .limit(12);
    const attnRows = attn || [];
    const reqIds = attnRows.map((t) => t.request_id).filter(Boolean);
    const { data: reqs } = reqIds.length
      ? await sb.from('trip_requests').select('id, destinations').in('id', reqIds)
      : { data: [] };
    const reqBy = Object.fromEntries((reqs || []).map((r) => [r.id, r]));
    const { data: recent } = await sb.from('ops_audit_log')
      .select('id, occurred_at, action, actor_user_id, resource_type, resource_id, trip_id, reason')
      .order('occurred_at', { ascending: false })
      .limit(8);

    const n = (v) => (v == null ? 0 : v);
    const matching = n(s.matching_now);
    const inProgress = n(s.in_progress);
    const confirmed = n(s.local_confirmed);
    const awaiting = n(s.awaiting_payment);
    const overdue = n(s.overdue);
    const chartTotal = matching + inProgress + confirmed + awaiting + overdue;
    const pct = (v) => (chartTotal > 0 ? Math.round((v / chartTotal) * 1000) / 10 : 0);
    const p1 = pct(inProgress);
    const p2 = pct(matching);
    const p3 = pct(confirmed);
    const p4 = pct(awaiting);
    const p5 = Math.max(0, Math.round((1000 - (p1 + p2 + p3 + p4) * 10)) / 10);

    const reasons = Object.entries(s.ops_reasons || {});
    const reasonMax = Math.max(1, ...reasons.map(([, v]) => Number(v) || 0));
    const reasonsHtml = reasons.length
      ? `<div class="reason-bars">${reasons.map(([k, v]) => {
          const width = Math.max(4, Math.round((Number(v) / reasonMax) * 100));
          return `<div class="reason-row">
            <div class="label" title="${esc(k)}">${esc(humanReason(k))}</div>
            <div class="reason-track"><div class="reason-fill" style="width:${width}%"></div></div>
            <div class="count">${esc(v)}</div>
          </div>`;
        }).join('')}</div>`
      : emptyState('No escalations in the last 30 days', 'Ops reasons will appear here when trips enter review.');

    const attnHtml = attnRows.length
      ? `<div class="attn-head"><span>Trip / destination</span><span>Reason</span><span>Priority</span><span>Time</span></div>
        <div class="attn-list">${attnRows.map((t) => {
          const dest = ((reqBy[t.request_id] || {}).destinations || []).filter(Boolean).join(', ');
          const title = dest || `Trip ${String(t.id).slice(0, 8)}`;
          return `<div class="attn-row" data-href="/ops/personal-trips/${t.id}" role="link" tabindex="0">
            <div>
              <div class="attn-title">${esc(title)}</div>
              <div class="attn-sub mono">${esc(String(t.id).slice(0, 8))}</div>
            </div>
            <div class="attn-reason">${esc(humanReason(t.ops_reason))}</div>
            <div>${priorityBadge(t.ops_priority)}</div>
            <div class="attn-time">${esc(relTime(t.created_at))}</div>
          </div>`;
        }).join('')}</div>`
      : emptyState('All clear — no trips require attention.', 'New escalations will show up here automatically.');

    const activityHtml = (recent || []).length
      ? `<div class="activity-list">${(recent || []).map((e) => {
          const ctx = e.trip_id
            ? `Trip ${String(e.trip_id).slice(0, 8)}${e.reason ? ` · ${humanReason(e.reason)}` : ''}`
            : (e.resource_type ? `${humanReason(e.resource_type)}${e.resource_id ? ` ${String(e.resource_id).slice(0, 8)}` : ''}` : 'Ops system');
          return `<div class="activity-row">
            <div class="activity-ico" aria-hidden="true">${activityIcon(e.action)}</div>
            <div>
              <div class="activity-title">${esc(activityTitle(e.action))}</div>
              <div class="activity-sub">${esc(ctx)}</div>
            </div>
            <div class="activity-time">${esc(relTime(e.occurred_at))}</div>
          </div>`;
        }).join('')}</div>`
      : emptyState('No recent Ops activity.', 'Audited actions will appear here.');

    const donutStyle = chartTotal > 0
      ? `--p1:${p1};--p2:${p2};--p3:${p3};--p4:${p4};--p5:${p5};`
      : '--p1:0;--p2:0;--p3:0;--p4:0;--p5:0;';

    const exportPayload = {
      generated_at: new Date().toISOString(),
      window: 'live_ops_counts_plus_30d_performance',
      stats: s,
    };
    lastExportPayload = exportPayload;

    return layout(`
      ${pageHeader('Overview', error ? error.message : 'Operational control center', `
        <div class="ops-control" title="Performance metrics use a 30-day window">
          ${ICO.calendar}
          <span>Last 30 days</span>
        </div>
        <button type="button" class="btn secondary" id="ops-export">
          ${ICO.download}<span>Export</span>
        </button>
      `)}

      <div class="kpi-grid" aria-label="Primary operational KPIs">
        ${kpiCard({ value: n(s.personal_trips_today), label: 'Personal Trips', tone: 'teal', href: '/ops/personal-trips', icon: ICO.trips, delta: { text: 'Created today', cls: '' } })}
        ${kpiCard({ value: matching, label: 'Matching now', tone: 'purple', href: '/ops/personal-trips?status=matching', icon: ICO.spark, delta: { text: 'Active matching', cls: '' } })}
        ${kpiCard({ value: n(s.needs_attention), label: 'Needs attention', tone: 'coral', href: '/ops/personal-trips?attn=1', icon: ICO.alerts, delta: { text: n(s.needs_attention) ? 'Requires Ops' : 'All clear', cls: n(s.needs_attention) ? 'warn' : 'up' } })}
        ${kpiCard({ value: confirmed, label: 'Local confirmed', tone: 'green', href: '/ops/personal-trips?status=local_confirmed', icon: ICO.locals, delta: { text: 'Ready for payment', cls: '' } })}
        ${kpiCard({ value: awaiting, label: 'Awaiting payment', tone: 'blue', href: '/ops/personal-trips?status=awaiting_payment', icon: ICO.trips, delta: { text: 'Checkout pending', cls: '' } })}
        ${kpiCard({ value: inProgress, label: 'In progress', tone: 'indigo', href: '/ops/personal-trips?status=planning', icon: ICO.overview, delta: { text: 'Fulfillment open', cls: '' } })}
        ${kpiCard({ value: overdue, label: 'Overdue', tone: 'red', href: '/ops/personal-trips?overdue=1', icon: ICO.alerts, delta: { text: overdue ? 'Past SLA due' : 'None overdue', cls: overdue ? 'down' : 'up' } })}
        ${kpiCard({ value: n(s.ready_today), label: 'Ready today', tone: 'lime', href: '/ops/personal-trips?status=ready', icon: ICO.apps, delta: { text: 'Completed today', cls: 'up' } })}
      </div>

      <div class="ops-dash-row">
        <section class="ops-card" aria-labelledby="attn-title">
          <div class="ops-card-head">
            <h2 class="ops-card-title" id="attn-title">Needs attention</h2>
            <a class="ops-card-link" href="/ops/personal-trips?attn=1">View all</a>
          </div>
          ${attnHtml}
        </section>
        <div class="ops-side-stack">
          <section class="ops-card" aria-labelledby="trips-ov-title">
            <div class="ops-card-head">
              <h2 class="ops-card-title" id="trips-ov-title">Trips overview</h2>
            </div>
            <div class="donut-wrap">
              <div class="donut${chartTotal ? '' : ' donut-empty'}" style="${donutStyle}" role="img" aria-label="Trip status distribution">
                <div class="donut-center">
                  <strong>${esc(chartTotal)}</strong>
                  <span>active</span>
                </div>
              </div>
              <ul class="donut-legend">
                <li><i style="background:var(--ops-indigo)"></i>In progress <b>${esc(inProgress)}</b></li>
                <li><i style="background:var(--ops-purple)"></i>Matching <b>${esc(matching)}</b></li>
                <li><i style="background:var(--ops-green)"></i>Confirmed <b>${esc(confirmed)}</b></li>
                <li><i style="background:var(--ops-blue)"></i>Awaiting payment <b>${esc(awaiting)}</b></li>
                <li><i style="background:var(--ops-red)"></i>Overdue <b>${esc(overdue)}</b></li>
              </ul>
            </div>
          </section>
          <section class="ops-card" aria-labelledby="activity-title">
            <div class="ops-card-head">
              <h2 class="ops-card-title" id="activity-title">Recent activity</h2>
              <a class="ops-card-link" href="/ops/audit">Audit</a>
            </div>
            ${activityHtml}
          </section>
        </div>
      </div>

      <section class="ops-card" aria-labelledby="perf-title">
        <div class="ops-card-head">
          <h2 class="ops-card-title" id="perf-title">Operational performance</h2>
        </div>
        <div class="perf-grid">
          <div class="perf-stat"><div class="n">${esc((s.automatic_pct ?? 0) + '%')}</div><div class="l">Automatic assignment</div></div>
          <div class="perf-stat"><div class="n">${esc((s.manual_pct ?? 0) + '%')}</div><div class="l">Manual assignment</div></div>
          <div class="perf-stat"><div class="n">${esc(s.median_match_minutes != null ? Math.round(s.median_match_minutes) + 'm' : '—')}</div><div class="l">Median match time</div></div>
          <div class="perf-stat"><div class="n">${esc((s.sla_success_pct ?? 0) + '%')}</div><div class="l">24h SLA success</div></div>
          <div class="perf-stat"><div class="n">${esc((s.no_candidate_pct ?? 0) + '%')}</div><div class="l">No candidate rate</div></div>
          <div class="perf-stat"><div class="n">${esc(n(s.open_alerts))}</div><div class="l">Open alerts</div></div>
        </div>
        <div style="height:18px"></div>
        <div class="ops-section-label">Ops reasons (30 days)</div>
        ${reasonsHtml}
      </section>
    `);
  }

  function card(n, l) {
    return `<div class="card"><div class="n">${esc(n ?? 0)}</div><div class="l">${esc(l)}</div></div>`;
  }

  function slaLabel(t) {
    if (!t.fulfillment_due_at) return 'N/A';
    if (['ready', 'completed'].includes(t.status) && t.ready_at && t.ready_at <= t.fulfillment_due_at) return 'Met';
    if (new Date(t.fulfillment_due_at) < Date.now() && ['planning', 'reviewing', 'paid'].includes(t.status)) return 'Overdue';
    if (t.fulfillment_due_at) return 'On track';
    return 'N/A';
  }

  async function tripsView() {
    const q = new URLSearchParams(location.search);
    let query = sb.from('trips').select('id, status, created_at, ops_reason, ops_priority, assigned_local_id, assignment_type, assigned_by, fulfillment_due_at, fulfillment_started_at, payment_confirmed_at, local_confirmed_at, last_activity_at, request_id, country_iso2, ops_owner_user_id, user_id, ready_at, completed_at, matching_started_at')
      .order('created_at', { ascending: true }).limit(300);
    const status = q.get('status');
    if (status) query = query.eq('status', status);
    if (q.get('unassigned') === '1') query = query.is('assigned_local_id', null);
    if (q.get('assignment')) query = query.eq('assignment_type', q.get('assignment'));
    if (q.get('attn') === '1') query = query.eq('status', 'ops_review');
    if (q.get('overdue') === '1') query = query.lt('fulfillment_due_at', new Date().toISOString());
    const { data: raw } = await query;
    const rows = (raw || []).slice().sort((a, b) => {
      const attn = (s) => (s === 'ops_review' ? 0 : 1);
      const d = attn(a.status) - attn(b.status);
      if (d) return d;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    const ids = rows.map((r) => r.request_id).filter(Boolean);
    const { data: reqs } = ids.length
      ? await sb.from('trip_requests').select('id, destinations, start_date, end_date, traveler_count, budget, user_id, traveler_type, pace, user_message').in('id', ids)
      : { data: [] };
    const reqBy = Object.fromEntries((reqs || []).map((r) => [r.id, r]));
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await sb.from('profiles').select('id, display_name, email, language_code').in('id', userIds)
      : { data: [] };
    const pBy = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    const localIds = [...new Set(rows.map((r) => r.assigned_local_id).filter(Boolean))];
    const { data: locals } = localIds.length
      ? await sb.from('mapica_locals').select('id, display_name').in('id', localIds)
      : { data: [] };
    const lBy = Object.fromEntries((locals || []).map((l) => [l.id, l]));
    const tripIds = rows.map((r) => r.id);
    const { data: notes } = tripIds.length
      ? await sb.from('ops_internal_notes').select('trip_id').in('trip_id', tripIds)
      : { data: [] };
    const noted = new Set((notes || []).map((n) => n.trip_id));
    const { data: orders } = tripIds.length
      ? await sb.from('commerce_orders').select('id, product_id, status, gross_amount_minor, currency').in('product_id', tripIds)
      : { data: [] };
    const oBy = Object.fromEntries((orders || []).map((o) => [o.product_id, o]));
    const { data: assigns } = tripIds.length
      ? await sb.from('local_assignments').select('trip_id, status').in('trip_id', tripIds)
      : { data: [] };
    const aCount = {};
    for (const a of assigns || []) {
      aCount[a.trip_id] = aCount[a.trip_id] || { found: 0, offered: 0 };
      aCount[a.trip_id].found += 1;
      if (a.status === 'offered') aCount[a.trip_id].offered += 1;
    }
    const needle = (q.get('q') || '').trim().toLowerCase();
    const filtered = rows.filter((t) => {
      if (!needle) return true;
      const r = reqBy[t.request_id] || {};
      const p = pBy[t.user_id] || {};
      const l = lBy[t.assigned_local_id] || {};
      const hay = [t.id, t.request_id, p.display_name, p.email, l.display_name, (r.destinations || []).join(' ')]
        .join(' ').toLowerCase();
      return hay.includes(needle);
    });
    const body = filtered.map((t) => {
      const r = reqBy[t.request_id] || {};
      const p = pBy[t.user_id] || {};
      const dest = (r.destinations || []).join(', ');
      const o = oBy[t.id] || {};
      const ac = aCount[t.id] || { found: 0, offered: 0 };
      const days = r.start_date && r.end_date
        ? Math.max(1, Math.round((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1)
        : 'N/A';
      return `<tr data-href="/ops/personal-trips/${t.id}">
        <td>${esc((t.request_id || '').slice(0, 8) || '—')}</td>
        <td>${esc(t.id.slice(0, 8))}</td>
        <td>${fmt(t.created_at)}</td>
        <td>${esc(p.display_name || '—')}</td>
        <td>${esc(p.email || '—')}</td>
        <td>${esc(p.language_code || '—')}</td>
        <td>${esc(dest)}</td>
        <td>${esc(t.country_iso2 || '—')}</td>
        <td>${esc(r.start_date || '—')}</td>
        <td>${esc(r.end_date || '—')}</td>
        <td>${esc(days)}</td>
        <td>${esc(r.pace || 'N/A')}</td>
        <td>${esc(r.budget || 'N/A')}</td>
        <td>${esc(r.traveler_count || '—')}</td>
        <td>${pill(t.status)}</td>
        <td>${esc(t.ops_reason || '—')}</td>
        <td>${esc(ac.found)}</td>
        <td>${esc(ac.offered)}</td>
        <td>${esc(lBy[t.assigned_local_id]?.display_name || '—')}</td>
        <td>${esc(t.assignment_type || '—')}</td>
        <td>${fmt(t.local_confirmed_at)}</td>
        <td>${esc(o.status || '—')}</td>
        <td>${esc(o.id ? o.id.slice(0, 8) : '—')}</td>
        <td>${o.gross_amount_minor != null ? (o.gross_amount_minor / 100).toFixed(0) : '—'}</td>
        <td>${esc(o.currency || '—')}</td>
        <td>${fmt(t.payment_confirmed_at)}</td>
        <td>${fmt(t.fulfillment_started_at)}</td>
        <td>${fmt(t.fulfillment_due_at)}</td>
        <td>${esc(remaining(t.fulfillment_due_at))}</td>
        <td>${fmt(t.ready_at)}</td>
        <td>${fmt(t.completed_at)}</td>
        <td>${esc(slaLabel(t))}</td>
        <td>${fmt(t.last_activity_at)}</td>
        <td>${esc((t.ops_owner_user_id || '').slice(0, 8) || '—')}</td>
        <td>${priorityBadge(t.ops_priority)}</td>
        <td>${noted.has(t.id) ? 'Yes' : '—'}</td>
      </tr>`;
    }).join('');
    return layout(`
      ${pageHeader('Personal Trips', 'Default: needs attention first, then oldest waiting request.')}
      <form class="filters" id="trip-filters">
        <select name="status" aria-label="Status">
          <option value="">All statuses</option>
          ${['requested','matching','offered','ops_review','local_confirmed','awaiting_payment','planning','ready','unavailable'].map((s) => `<option ${status===s?'selected':''} value="${s}">${s}</option>`).join('')}
        </select>
        <select name="assignment" aria-label="Assignment type">
          <option value="">Assignment type</option>
          ${['automatic','manual','manual_self'].map((s) => `<option ${q.get('assignment')===s?'selected':''} value="${s}">${s}</option>`).join('')}
        </select>
        <label><input type="checkbox" name="unassigned" value="1" ${q.get('unassigned')==='1'?'checked':''}/> Unassigned</label>
        <label><input type="checkbox" name="attn" value="1" ${q.get('attn')==='1'?'checked':''}/> Needs attention</label>
        <label><input type="checkbox" name="overdue" value="1" ${q.get('overdue')==='1'?'checked':''}/> Overdue</label>
        <input name="q" placeholder="Search ID / traveler / email / Local / destination" value="${esc(q.get('q') || '')}" aria-label="Search trips" />
        <button class="btn secondary" type="submit">Filter</button>
      </form>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Request ID</th><th>Trip ID</th><th>Created At</th><th>Traveler</th><th>Traveler Email</th><th>Language</th>
          <th>Destination</th><th>Country/Region</th><th>Trip Start</th><th>Trip End</th><th>Duration</th>
          <th>Travel Style</th><th>Budget</th><th>Party Size</th>
          <th>Status</th><th>Ops Reason</th><th>Candidates Found</th><th>Offers Sent</th>
          <th>Assigned Local</th><th>Assignment Type</th><th>Local Confirmed At</th>
          <th>Payment Status</th><th>Order ID</th><th>Price</th><th>Currency</th>
          <th>Payment Confirmed At</th><th>Fulfillment Started At</th><th>Due At</th><th>Time Remaining</th>
          <th>Ready At</th><th>Completed At</th><th>SLA Status</th><th>Last Activity</th>
          <th>Ops Owner</th><th>Priority</th><th>Notes</th>
        </tr></thead>
        <tbody>${body || '<tr><td colspan="36">No trips match these filters.</td></tr>'}</tbody>
      </table></div>
    `);
  }

  async function tripDetail(id) {
    const { data: t, error } = await sb.from('trips').select('*').eq('id', id).maybeSingle();
    if (error || !t) return layout(`<h1>Not found</h1><p>${esc(error?.message || '')}</p>`);
    const { data: req } = await sb.from('trip_requests').select('*').eq('id', t.request_id).maybeSingle();
    const { data: profile } = await sb.from('profiles').select('id, display_name, email, language_code').eq('id', t.user_id).maybeSingle();
    const { data: local } = t.assigned_local_id
      ? await sb.from('mapica_locals').select('id, display_name, status, user_id').eq('id', t.assigned_local_id).maybeSingle()
      : { data: null };
    const { data: assigns } = await sb.from('local_assignments').select('*').eq('trip_id', id).order('created_at');
    const { data: events } = await sb.from('trip_ops_events').select('*').eq('trip_id', id).order('occurred_at');
    const { data: notes } = await sb.from('ops_internal_notes').select('*').eq('trip_id', id).order('created_at');
    const { data: orders } = await sb.from('commerce_orders').select('id, order_number, status, gross_amount_minor, currency, paid_at, product_type').eq('product_id', id);
    const { data: myLocal } = await sb.from('mapica_locals').select('id, status, verification_status').eq('user_id', session.user.id).maybeSingle();
    const canSelf = myLocal && myLocal.status === 'approved' && myLocal.verification_status === 'approved';
    const dest = (req?.destinations || []).join(', ');
    return layout(`
      ${pageHeader(`Request ${id.slice(0, 8)}`, `${t.status} · priority ${t.ops_priority || 'normal'} · ${t.ops_reason || 'no ops reason'}`)}
      <p class="sub" style="margin-top:-12px;margin-bottom:18px">${pill(t.status)} ${priorityBadge(t.ops_priority)}</p>
      <div class="grid2">
        <div>
          <div class="section card"><h2>Request</h2>
            <p>Request ID <span class="mono">${esc(t.request_id)}</span><br>Trip ID <span class="mono">${esc(t.id)}</span><br>Created ${fmt(t.created_at)}</p></div>
          <div class="section card"><h2>Traveler</h2>
            <p>${esc(profile?.display_name)}<br>${esc(profile?.email)}<br>Language ${esc(profile?.language_code)}<br>Account <span class="mono">${esc(t.user_id)}</span></p></div>
          <div class="section card"><h2>Trip</h2>
            <p>${esc(dest)}<br>${esc(req?.start_date)} – ${esc(req?.end_date)}<br>Party ${esc(req?.traveler_count)} · ${esc(req?.traveler_type)}<br>Budget ${esc(req?.budget)} · pace ${esc(req?.pace)}<br>${esc(req?.user_message || '')}</p></div>
          <div class="section card"><h2>Matching / assignment</h2>
            <p>Type ${esc(t.assignment_type || '—')}<br>Assigned ${esc(local?.display_name || '—')}<br>Confirmed ${fmt(t.local_confirmed_at)}</p>
            <table><thead><tr><th>Local</th><th>Status</th><th>Type</th><th>Offered</th><th>Expires</th></tr></thead>
            <tbody>${(assigns || []).map((a) => `<tr><td class="mono">${esc(a.local_id.slice(0,8))}</td><td>${esc(a.status)}</td><td>${esc(a.assignment_type)}</td><td>${fmt(a.offered_at)}</td><td>${fmt(a.expires_at)}</td></tr>`).join('')}</tbody></table>
          </div>
          <div class="section card"><h2>Payment</h2>
            ${(orders || []).map((o) => `<p>${esc(o.order_number)} · ${esc(o.status)} · ${(o.gross_amount_minor/100).toFixed(0)} ${esc(o.currency)} · paid ${fmt(o.paid_at)}</p>`).join('') || '<p>No order yet</p>'}
          </div>
          <div class="section card"><h2>Fulfillment / SLA</h2>
            <p>Started ${fmt(t.fulfillment_started_at)}<br>Due ${fmt(t.fulfillment_due_at)}<br>Remaining ${esc(remaining(t.fulfillment_due_at))}<br>Ready ${fmt(t.ready_at)}</p>
          </div>
          <div class="section card"><h2>Timeline</h2>
            <ul class="timeline">${(events || []).map((e) => `<li><time>${fmt(e.occurred_at)}</time>${esc(e.event_type)}</li>`).join('') || '<li>No events yet</li>'}</ul>
          </div>
        </div>
        <div>
          <div class="section card"><h2>Ops actions</h2>
            <label>Search Local</label>
            <input id="local-search" class="field" placeholder="Name or region" />
            <div class="picker" id="local-picker"></div>
            <input id="offer-local" class="field" placeholder="Selected Local id" />
            <div class="btn-row"><button class="btn" data-act="offer">Offer to Local</button></div>
            <hr style="border:0;border-top:1px solid var(--ops-border);margin:14px 0" />
            <input id="assign-local" class="field" placeholder="Local id to assign" />
            <select id="assign-reason" class="field">
              <option value="">Assignment reason</option>
              <option>already_confirmed_offline</option>
              <option>ops_override</option>
              <option>creator_requested</option>
              <option>other</option>
            </select>
            <div class="btn-row">
              <button class="btn" data-act="assign">Assign Local</button>
              ${canSelf ? `<button class="btn secondary" data-act="assign-me">Assign to me</button>` : ''}
            </div>
            <hr style="border:0;border-top:1px solid var(--ops-border);margin:14px 0" />
            <input id="reassign-local" class="field" placeholder="new local id" />
            <select id="reassign-reason" class="field">
              <option value="">Reassign reason</option>
              <option>local_cancelled</option>
              <option>ops_quality</option>
              <option>availability</option>
              <option>traveler_request</option>
              <option>staff_override</option>
              <option>other</option>
            </select>
            <div class="btn-row"><button class="btn secondary" data-act="reassign">Reassign</button></div>
            <hr style="border:0;border-top:1px solid var(--ops-border);margin:14px 0" />
            <select id="prio" class="field">${['normal','high','urgent'].map((p)=>`<option ${t.ops_priority===p?'selected':''}>${p}</option>`).join('')}</select>
            <div class="btn-row">
              <button class="btn secondary" data-act="prio">Set priority</button>
              <button class="btn secondary" data-act="take">Take ownership</button>
              <button class="btn danger" data-act="unavail">Mark unavailable</button>
            </div>
            <p class="err" id="act-err"></p>
          </div>
          <div class="section card"><h2>Internal notes</h2>
            ${(notes || []).map((n) => `<div class="note">${esc(n.body)}<br><time>${fmt(n.created_at)}</time></div>`).join('') || '<p class="sub">No notes yet</p>'}
            <textarea id="note-body" rows="3" placeholder="Staff-only note"></textarea>
            <div class="btn-row"><button class="btn secondary" data-act="note">Add note</button></div>
          </div>
        </div>
      </div>
    `);
  }

  async function localsView() {
    const { data } = await sb.from('mapica_locals').select('id, display_name, status, verification_status, country_id, languages, completed_trips, quality_score, rating, created_at, user_id').order('created_at', { ascending: false }).limit(200);
    const userIds = (data || []).map((l) => l.user_id).filter(Boolean);
    const { data: profiles } = userIds.length ? await sb.from('profiles').select('id, email').in('id', userIds) : { data: [] };
    const pBy = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    return layout(`${pageHeader('Locals', 'Approved and pending Local creators.')}
      <div class="table-wrap"><table><thead><tr><th>Local ID</th><th>Name</th><th>Email</th><th>Status</th><th>Approved</th><th>Country</th><th>Languages</th><th>Completed</th><th>Rating</th><th>Created</th></tr></thead>
      <tbody>${(data || []).map((l) => `<tr data-href="/ops/locals/${l.id}"><td class="mono">${esc(l.id.slice(0,8))}</td><td>${esc(l.display_name)}</td><td>${esc(pBy[l.user_id]?.email || '—')}</td><td>${pill(l.status)}</td><td>${esc(l.verification_status)}</td><td>${esc(l.country_id)}</td><td>${esc((l.languages||[]).join(', '))}</td><td>${esc(l.completed_trips)}</td><td>${esc(l.rating ?? '—')}</td><td>${fmt(l.created_at)}</td></tr>`).join('') || '<tr><td colspan="10">No Locals yet.</td></tr>'}</tbody></table></div>`);
  }

  async function localDetail(id) {
    const { data: l } = await sb.from('mapica_locals').select('*').eq('id', id).maybeSingle();
    const { data: assigns } = await sb.from('local_assignments').select('id, trip_id, status, assignment_type, created_at').eq('local_id', id).order('created_at', { ascending: false }).limit(50);
    return layout(`${pageHeader(l?.display_name || 'Local', `${l?.status || ''} · verification ${l?.verification_status || ''} · ${l?.country_id || ''}`)}
      <p class="sub" style="margin-top:-12px;margin-bottom:18px">${pill(l?.status)}</p>
      <div class="section card"><h2>Profile</h2>
        <p>Languages ${(l?.languages || []).join(', ') || '—'}<br>About ${esc(l?.about || '—')}<br>Completed ${esc(l?.completed_trips)} · rating ${esc(l?.rating ?? '—')}</p>
        ${staff.role === 'ops_manager' || staff.role === 'admin' ? `
          <div class="btn-row">
            <button class="btn danger" data-act-local="deactivate">Deactivate Local</button>
            <button class="btn secondary" data-act-local="reactivate">Reactivate</button>
          </div>
          <p class="err" id="local-act-err"></p>
        ` : ''}
      </div>
      <div class="section card"><h2>Assignment history</h2>
      <table><thead><tr><th>Trip</th><th>Status</th><th>Type</th><th>When</th></tr></thead>
      <tbody>${(assigns || []).map((a) => `<tr data-href="/ops/personal-trips/${a.trip_id}"><td class="mono">${esc(a.trip_id.slice(0,8))}</td><td>${esc(a.status)}</td><td>${esc(a.assignment_type)}</td><td>${fmt(a.created_at)}</td></tr>`).join('') || '<tr><td colspan="4">No assignments yet.</td></tr>'}</tbody></table></div>`);
  }

  async function appsView() {
    const notice = flash;
    flash = '';
    const { data } = await sb.from('local_applications').select('id, user_id, status, verification_status, created_at, payload').order('created_at', { ascending: false }).limit(100);
    const userIds = (data || []).map((a) => a.user_id).filter(Boolean);
    const { data: profiles } = userIds.length
      ? await sb.from('profiles').select('id, display_name, email').in('id', userIds)
      : { data: [] };
    const pBy = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    return layout(`${pageHeader('Applications', 'Review, request more info, approve, or decline. Every action is audited.')}
      ${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}
      <div class="table-wrap"><table><thead><tr>
        <th>Applicant</th><th>Destination / region</th><th>Languages</th><th>Applied at</th><th>Status</th>
      </tr></thead>
      <tbody>${(data || []).map((a) => {
        const p = pBy[a.user_id] || {};
        const payload = a.payload || {};
        const dest = payload.homeCityName || payload.homeCountryName || payload.region || payload.country || '—';
        const langs = Array.isArray(payload.languages) ? payload.languages.join(', ')
          : (payload.languages || payload.spokenLanguages || '—');
        return `<tr data-href="/ops/local-applications/${a.id}">
          <td>${esc(p.display_name || 'Applicant')}<div class="attn-sub">${esc(p.email || a.user_id.slice(0, 8))}</div></td>
          <td>${esc(dest)}</td>
          <td>${esc(typeof langs === 'string' ? langs : '—')}</td>
          <td>${fmt(a.created_at)}</td>
          <td>${pill(a.status)}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="5">No applications yet.</td></tr>'}</tbody></table></div>`);
  }

  async function appDetail(id) {
    const { data: a } = await sb.from('local_applications').select('*').eq('id', id).maybeSingle();
    if (!a) return layout('<h1>Not found</h1>');
    const { data: profile } = await sb.from('profiles').select('display_name, email').eq('id', a.user_id).maybeSingle();
    const payload = JSON.stringify(a.payload || {}, null, 2);
    const notice = flash;
    flash = '';
    const p = a.payload || {};
    const dest = p.homeCityName || p.homeCountryName || p.region || '—';
    const langs = Array.isArray(p.languages) ? p.languages.join(', ') : (p.languages || '—');
    return layout(`${pageHeader(`Application ${id.slice(0, 8)}`, `${profile?.display_name || 'Applicant'} · ${profile?.email || ''}`)}
      <p class="sub" style="margin-top:-12px;margin-bottom:18px">${pill(a.status)} · ${esc(a.verification_status)} · ${esc(dest)} · ${esc(langs)}</p>
      ${notice ? `<div class="notice" role="status">${esc(notice)}</div>` : ''}
      <div class="section card"><h2>Payload</h2><pre class="payload">${esc(payload)}</pre></div>
      <div class="section card"><h2>Review</h2>
        <textarea id="app-note" rows="3" placeholder="Note for decline / more info">${esc(a.staff_request_note || '')}</textarea>
        <div class="btn-row">
          <button class="btn" data-app="approve">Approve Local</button>
          <button class="btn secondary" data-app="request_info">Request more info</button>
          <button class="btn danger" data-app="decline">Decline</button>
        </div>
        <p class="err" id="app-err"></p>
      </div>`);
  }

  async function financeView() {
    const role = staff?.role || '';
    if (!canAccessFinance(role)) {
      return layout(`${pageHeader('Finance', 'Access restricted')}
        <p class="sub">Finance requires <strong>ops_manager</strong> or <strong>admin</strong>. Contact an admin if you need access.</p>`);
    }
    const q = new URLSearchParams(location.search);
    const days = Math.max(1, Math.min(365, Number(q.get('days')) || 30));
    const [{ data: summary, error: sumErr }, { data: sales, error: salesErr }] = await Promise.all([
      sb.rpc('ops_financial_summary', { p_days: days }),
      sb.rpc('ops_financial_sales', { p_limit: 200 }),
    ]);
    const s = (summary && summary[0]) || {};
    const rows = sales || [];
    const canRelease = role === 'ops_manager' || role === 'admin';

    const periodLinks = [1, 7, 30, 90].map((d) => {
      const active = d === days ? ' active' : '';
      const label = d === 1 ? 'Today' : `${d}d`;
      return `<a class="ops-chip${active}" href="/ops/finance?days=${d}">${label}</a>`;
    }).join('');

    const tableRows = rows.map((r) => {
      const type = productTypeLabel(r.product_type);
      const refund = Number(r.refund_amount_cents) || 0;
      return `<tr data-finance-order="${r.order_id}" class="finance-row">
        <td>${esc(fmt(r.paid_at || r.created_at))}</td>
        <td>
          <div class="attn-title">${esc(r.product_title || r.order_number || '—')}</div>
          <div class="attn-sub mono">${esc(r.order_number || '')}</div>
        </td>
        <td>${esc(type)}</td>
        <td>${moneyCents(r.gross_customer_amount_cents, r.currency)}</td>
        <td>${moneyCents(r.payment_fee_cents + r.store_fee_cents + r.tax_amount_cents, r.currency)}</td>
        <td>${moneyCents(r.net_receipts_cents, r.currency)}</td>
        <td>${moneyCents(r.creator_earnings_cents, r.currency)}</td>
        <td>${moneyCents(r.mapica_revenue_cents, r.currency)}</td>
        <td>${refund > 0 ? moneyCents(refund, r.currency) : '—'}</td>
        <td>${pill(r.creator_payable_status || r.payment_status)}</td>
      </tr>`;
    }).join('');

    return layout(`${pageHeader('Finance', sumErr ? sumErr.message : 'Private sales ledger — Gross → Net Receipts → Local / Mapica split', `
        <div class="ops-chip-row">${periodLinks}</div>
      `)}
      ${salesErr ? `<p class="err">${esc(salesErr.message)}</p>` : ''}
      <div class="kpi-grid" aria-label="Finance KPIs">
        ${kpiCard({ value: moneyCents(s.gross_sales_cents), label: 'Gross sales', tone: 'teal', icon: ICO.finance })}
        ${kpiCard({ value: moneyCents(s.net_receipts_cents), label: 'Net receipts', tone: 'blue', icon: ICO.finance })}
        ${kpiCard({ value: moneyCents(s.mapica_revenue_cents), label: 'Mapica revenue', tone: 'indigo', icon: ICO.finance })}
        ${kpiCard({ value: moneyCents(s.creator_earnings_cents), label: 'Creator earnings', tone: 'lime', icon: ICO.locals })}
        ${kpiCard({ value: moneyCents(s.outstanding_creator_payables_cents), label: 'Outstanding payables', tone: 'orange', icon: ICO.finance })}
        ${kpiCard({ value: moneyCents(s.refunds_cents), label: 'Refunds', tone: 'red', icon: ICO.finance })}
      </div>
      <div class="cards" style="margin-top:-6px">
        ${card(s.orders_count, 'Paid orders')}
        ${card(moneyCents(s.ready_route_gmv_cents), 'Ready Route GMV')}
        ${card(moneyCents(s.custom_trip_gmv_cents), 'Custom Trip GMV')}
        ${card(moneyCents(s.payment_fees_cents), 'Payment fees')}
        ${card(moneyCents(s.store_fees_cents), 'Store fees')}
        ${card(moneyCents(s.paid_to_creators_cents), 'Paid to creators')}
      </div>
      <section class="section card" style="margin-top:18px">
        <div class="ops-section-label">Sales</div>
        <div class="table-wrap finance-table-wrap"><table>
          <thead><tr>
            <th>Date</th><th>Sale</th><th>Type</th><th>Gross</th><th>Fees+Tax</th>
            <th>Net</th><th>Local</th><th>Mapica</th><th>Refund</th><th>Status</th>
          </tr></thead>
          <tbody>${tableRows || '<tr><td colspan="10">No paid sales yet.</td></tr>'}</tbody>
        </table></div>
        <p class="sub" style="margin-top:12px">Click a row for full reconciliation.${canRelease ? ' Managers can release pending payables from the detail drawer.' : ''}</p>
      </section>
      <div id="finance-modal-root"></div>`);
  }

  async function openFinanceDetail(orderId) {
    const root = document.getElementById('finance-modal-root');
    if (!root) return;
    root.innerHTML = `<div class="modal finance-modal" id="finance-modal"><div class="box finance-box"><p class="sub">Loading…</p></div></div>`;
    const { data, error } = await sb.rpc('ops_financial_sale_detail', { p_order_id: orderId });
    if (error) {
      root.innerHTML = `<div class="modal finance-modal" id="finance-modal"><div class="box finance-box"><p class="err">${esc(error.message)}</p><button type="button" class="btn secondary" id="finance-close">Close</button></div></div>`;
      return;
    }
    const order = data?.order || {};
    const sale = data?.sale_ledger || {};
    const payables = data?.creator_payables || [];
    const adjustments = data?.adjustments || [];
    const creator = data?.creator_profile || {};
    const role = staff?.role || '';
    const canRelease = (role === 'ops_manager' || role === 'admin')
      && payables.some((p) => p.entry_type === 'creator_payable' && p.status === 'pending');

    const rows = [
      ['Order', order.order_number],
      ['Product', `${productTypeLabel(order.product_type)} · ${order.product_title || ''}`],
      ['Creator', creator.display_name || order.creator_id || '—'],
      ['Gross', moneyCents(order.gross_amount_minor, order.currency)],
      ['VAT', moneyCents(order.vat_amount_minor, order.currency)],
      ['Stripe fee', moneyCents(order.stripe_fee_minor, order.currency)],
      ['Store fee (expected)', moneyCents(order.apple_commission_expected_minor, order.currency)],
      ['Net receipts', moneyCents(order.net_receipts_minor, order.currency)],
      ['Creator share', moneyCents(sale.creator_earnings_cents ?? order.creator_share_minor, order.currency)],
      ['Mapica share', moneyCents(sale.mapica_amount_cents ?? order.mapica_share_minor, order.currency)],
      ['Refund', moneyCents(order.refund_amount_minor, order.currency)],
      ['Payment status', order.status],
      ['Settlement policy', sale.settlement_policy_version || '2026.08.1'],
    ];

    root.innerHTML = `<div class="modal finance-modal" id="finance-modal">
      <div class="box finance-box">
        <h3>Sale reconciliation</h3>
        <p class="sub mono">${esc(String(orderId))}</p>
        <div class="finance-kv">${rows.map(([k, v]) => `<div class="finance-kv-row"><span>${esc(k)}</span><strong>${esc(String(v ?? '—'))}</strong></div>`).join('')}</div>
        ${payables.length ? `<div class="ops-section-label" style="margin-top:16px">Creator payables</div>
          <pre class="payload">${esc(JSON.stringify(payables, null, 2))}</pre>` : ''}
        ${adjustments.length ? `<div class="ops-section-label" style="margin-top:16px">Adjustments</div>
          <pre class="payload">${esc(JSON.stringify(adjustments, null, 2))}</pre>` : ''}
        <div class="btn-row">
          ${canRelease ? `<button type="button" class="btn" id="finance-release" data-order="${esc(orderId)}">Release payable</button>` : ''}
          <button type="button" class="btn secondary" id="finance-close">Close</button>
        </div>
        <p class="err" id="finance-err"></p>
      </div>
    </div>`;
  }

  async function alertsView() {
    const { data } = await sb.from('ops_alerts').select('*').order('created_at', { ascending: false }).limit(100);
    const rows = data || [];
    return layout(`${pageHeader('Alerts', 'Operational alerts requiring acknowledgment or follow-up.')}
      <div class="table-wrap"><table><thead><tr><th>Severity</th><th>Event</th><th>Status</th><th>Trip</th><th>Age</th><th>Actions</th></tr></thead>
      <tbody>${rows.map((a) => `<tr>
        <td>${priorityBadge(a.severity === 'critical' ? 'urgent' : a.severity)}</td>
        <td>${esc(humanReason(a.alert_type))}</td>
        <td>${pill(a.status)}</td>
        <td>${a.trip_id ? `<a href="/ops/personal-trips/${a.trip_id}">${esc(a.trip_id.slice(0,8))}</a>` : '—'}</td>
        <td>${esc(relTime(a.created_at))}</td>
        <td>${a.status === 'open' ? `<button class="btn secondary" data-ack="${a.id}">Acknowledge</button>` : '—'}</td>
      </tr>`).join('') || `<tr><td colspan="6">${'No open alerts.'}</td></tr>`}</tbody></table></div>`);
  }

  async function auditView() {
    const { data } = await sb.from('ops_audit_log').select('*').order('occurred_at', { ascending: false }).limit(200);
    return layout(`${pageHeader('Audit', 'Append-only event log. Staff cannot update or delete these rows.')}
      <div class="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Reason</th></tr></thead>
      <tbody>${(data || []).map((a) => `<tr>
        <td>${fmt(a.occurred_at)}</td>
        <td><span class="mono">${esc((a.actor_user_id || '').slice(0,8) || '—')}</span> · ${esc(a.actor_role || '')}</td>
        <td>${esc(activityTitle(a.action))}</td>
        <td>${esc(a.resource_type)}${a.resource_id ? ` <span class="mono">${esc(String(a.resource_id).slice(0, 8))}</span>` : ''}${a.trip_id ? ` · trip <span class="mono">${esc(a.trip_id.slice(0,8))}</span>` : ''}</td>
        <td>${esc(a.reason || '—')}</td>
      </tr>`).join('') || '<tr><td colspan="5">No audit events yet.</td></tr>'}</tbody></table></div>`);
  }

  async function staffView() {
    if (staff.role !== 'admin') return layout(`${pageHeader('Staff', 'Admin only')}<p class="sub">You need the admin role to manage staff.</p>`);
    const { data } = await sb.from('staff_users').select('*').order('created_at');
    return layout(`${pageHeader('Staff', 'Authorized Ops operators. Access is gated by staff_users.')}
      <div class="card" style="margin-bottom:16px">
        <label>Authorize existing account (user uuid)</label>
        <div class="filters" style="margin:8px 0 0">
          <input id="staff-id" class="field" placeholder="user uuid" style="min-width:280px" />
          <select id="staff-role" class="field"><option>ops_agent</option><option>ops_manager</option><option>admin</option></select>
          <button class="btn" id="staff-add">Save role</button>
        </div>
        <p class="err" id="staff-err"></p>
      </div>
      <div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Active</th><th>Last login</th><th>Created</th></tr></thead>
      <tbody>${(data || []).map((s) => `<tr>
        <td class="mono">${esc(s.user_id)}</td>
        <td>${esc(s.role)}</td>
        <td>${s.active ? '<span class="ops-badge st-ok">Active</span>' : '<span class="ops-badge st-mute">Inactive</span>'}</td>
        <td>${fmt(s.last_login_at)}</td>
        <td>${fmt(s.created_at)}</td>
      </tr>`).join('')}</tbody></table></div>
      <p class="sub" style="margin-top:14px">MFA: enable TOTP in Supabase Dashboard → Authentication → Multi-Factor. Ops does not treat MFA as active until that is configured.</p>`);
  }

  async function render() {
    const seq = ++renderSeq;
    try {
      if (!sb) await initClient();
      if (seq !== renderSeq) return;
      await loadStaff();
      if (seq !== renderSeq) return;
      if (!session) {
        const params = new URLSearchParams(location.search);
        if (params.get('error') || /error=/.test(location.hash || '')) {
          const desc = params.get('error_description') || params.get('error') || 'Google sign-in was cancelled.';
          history.replaceState({}, '', '/ops');
          app.innerHTML = loginView(desc);
          bindOnce();
          return;
        }
        // Never fetch Ops data before auth.
        app.innerHTML = loginView();
        bindOnce();
        return;
      }
      {
        const stopped = await finishAuthNavigation();
        if (stopped) return;
      }
      if (seq !== renderSeq) return;
      const p = path();
      if (!staff) {
        // Authenticated but not staff — Access Denied, zero privileged queries.
        app.innerHTML = denied();
        bindOnce();
        return;
      }
      try {
        const { count } = await sb.from('ops_alerts').select('id', { count: 'exact', head: true }).eq('status', 'open');
        openAlerts = count || 0;
      } catch {
        openAlerts = 0;
      }
      if (seq !== renderSeq) return;
      let html = '';
      for (const [re, name] of routes) {
        const m = p.match(re);
        if (!m) continue;
        if (name === 'overview') html = await overview();
        else if (name === 'trips') html = await tripsView();
        else if (name === 'trip') html = await tripDetail(m[1]);
        else if (name === 'locals') html = await localsView();
        else if (name === 'local') html = await localDetail(m[1]);
        else if (name === 'apps') html = await appsView();
        else if (name === 'app') html = await appDetail(m[1]);
        else if (name === 'alerts') html = await alertsView();
        else if (name === 'finance') html = await financeView();
        else if (name === 'audit') html = await auditView();
        else if (name === 'staff') html = await staffView();
        break;
      }
      if (seq !== renderSeq) return;
      app.innerHTML = html || await overview();
      bindOnce();
    } catch (e) {
      if (seq !== renderSeq) return;
      app.innerHTML = loginView(e.message || String(e));
      bindOnce();
    }
  }

  async function reviewApplication(btn) {
    const action = btn.getAttribute('data-app');
    const note = $('#app-note')?.value || '';
    const id = path().split('/').pop();
    const msg = action === 'approve'
      ? 'Approve this applicant as a Mapica Local? This creates or updates their Local profile.'
      : action === 'decline'
        ? 'Decline this Local application? The applicant will not become a Local.'
        : 'Request more information from this applicant?';
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (!window.confirm(msg)) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      return;
    }
    let error = null;
    try {
      const res = await sb.rpc('ops_review_local_application', {
        p_application_id: id, p_action: action, p_note: note || null,
      });
      error = res.error;
    } catch (e) {
      error = e;
    }
    const err = $('#app-err');
    if (error) {
      if (err) err.textContent = error.message || String(error);
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      return;
    }
    if (action === 'approve') {
      flash = 'Local approved. The applicant is now a Mapica Local.';
      go('/ops/local-applications', true);
      return;
    }
    if (action === 'decline') {
      flash = 'Application declined.';
      go('/ops/local-applications', true);
      return;
    }
    flash = 'More information requested.';
    render();
  }

  async function signOutOps() {
    session = null;
    staff = null;
    clearTimeout(idleTimer);
    sessionStorage.removeItem('ops_next');
    if (sb) await sb.auth.signOut();
    app.innerHTML = loginView();
    history.replaceState({}, '', '/ops');
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', () => { if (staff) bumpIdle(); });
    app.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('.attn-row[data-href]');
      if (!row || !app.contains(row)) return;
      e.preventDefault();
      go(row.getAttribute('data-href'));
    });
    app.addEventListener('click', async (e) => {
      const a = e.target.closest('a[href^="/ops"]');
      if (a && app.contains(a) && !e.defaultPrevented) {
        e.preventDefault();
        go(a.getAttribute('href'));
        return;
      }
      const tr = e.target.closest('tr[data-href]');
      if (tr && !e.target.closest('a, button, input, select, textarea')) {
        go(tr.getAttribute('data-href'));
        return;
      }
      const financeRow = e.target.closest('tr[data-finance-order]');
      if (financeRow) {
        await openFinanceDetail(financeRow.getAttribute('data-finance-order'));
        return;
      }
      if (e.target.closest('#finance-close') || e.target.closest('#finance-modal.finance-modal') === e.target) {
        const root = document.getElementById('finance-modal-root');
        if (root) root.innerHTML = '';
        return;
      }
      if (e.target.closest('#finance-release')) {
        const btn = e.target.closest('#finance-release');
        const orderId = btn.getAttribute('data-order');
        const reason = window.prompt('Release reason (optional)') || null;
        const errBox = document.getElementById('finance-err');
        btn.disabled = true;
        try {
          const { error } = await sb.rpc('ops_release_creator_payable', {
            p_order_id: orderId,
            p_reason: reason,
          });
          if (error && errBox) errBox.textContent = error.message;
          else {
            const root = document.getElementById('finance-modal-root');
            if (root) root.innerHTML = '';
            flash = 'Creator payable released.';
            render();
          }
        } catch (err) {
          if (errBox) errBox.textContent = err.message || String(err);
          btn.disabled = false;
        }
        return;
      }
      const attn = e.target.closest('.attn-row[data-href]');
      if (attn) {
        go(attn.getAttribute('data-href'));
        return;
      }
      if (e.target.closest('#ops-export')) {
        if (!lastExportPayload) return;
        const blob = new Blob([JSON.stringify(lastExportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapica-ops-overview-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const localPick = e.target.closest('[data-local]');
      if (localPick) {
        const id = localPick.getAttribute('data-local');
        ['offer-local', 'assign-local', 'reassign-local'].forEach((fid) => {
          const el = document.getElementById(fid);
          if (el) el.value = id;
        });
        return;
      }
      if (e.target.closest('#logout')) {
        await signOutOps();
        return;
      }
      if (e.target.closest('#google-login')) {
        await startGoogleLogin(e.target.closest('#google-login'));
        return;
      }
      const appBtn = e.target.closest('[data-app]');
      if (appBtn) {
        await reviewApplication(appBtn);
        return;
      }
      const actLocal = e.target.closest('[data-act-local]');
      if (actLocal) {
        const id = path().split('/').pop();
        const active = actLocal.getAttribute('data-act-local') === 'reactivate';
        const msg = active
          ? 'Reactivate this Local so they can receive offers again?'
          : 'Deactivate this Local? They will no longer be eligible for matching or assignment.';
        if (!window.confirm(msg)) return;
        const reason = window.prompt('Reason (required)') || '';
        let error = null;
        try {
          const res = await sb.rpc('ops_set_local_active', {
            p_local_id: id, p_active: active, p_reason: reason,
          });
          error = res.error;
        } catch (err) {
          error = err;
        }
        const box = $('#local-act-err');
        if (error && box) box.textContent = error.message || String(error);
        else render();
        return;
      }
      const act = e.target.closest('[data-act]');
      if (act) {
        await runAction(act.getAttribute('data-act'));
        return;
      }
      const ack = e.target.closest('[data-ack]');
      if (ack) {
        try {
          await sb.rpc('ops_ack_alert', { p_alert_id: ack.getAttribute('data-ack') });
        } catch { /* ignore */ }
        render();
        return;
      }
      if (e.target.closest('#staff-add')) {
        const id = $('#staff-id').value.trim();
        const role = $('#staff-role').value;
        let error = null;
        try {
          const res = await sb.rpc('ops_upsert_staff', { p_user_id: id, p_role: role, p_active: true });
          error = res.error;
        } catch (err) {
          error = err;
        }
        const box = $('#staff-err');
        if (box) box.textContent = error ? (error.message || String(error)) : 'Saved';
        if (!error) render();
      }
    });
    app.addEventListener('submit', async (e) => {
      if (e.target.id === 'login-form') {
        e.preventDefault();
        const submit = e.target.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        const fd = new FormData(e.target);
        const { error } = await sb.auth.signInWithPassword({
          email: String(fd.get('email') || ''),
          password: String(fd.get('password') || ''),
        });
        if (error) {
          app.innerHTML = loginView(error.message);
          return;
        }
        staff = null;
        const next = takeReturnPath();
        go(next, true);
        return;
      }
      if (e.target.id === 'trip-filters') {
        e.preventDefault();
        const fd = new FormData(e.target);
        const params = new URLSearchParams();
        for (const [k, v] of fd.entries()) {
          if (v) params.set(k, String(v));
        }
        const qs = params.toString();
        go('/ops/personal-trips' + (qs ? '?' + qs : ''));
      }
    });
    app.addEventListener('input', async (e) => {
      if (e.target.id !== 'local-search') return;
      const q = e.target.value.trim();
      const box = $('#local-picker');
      if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; return; }
      const { data } = await sb.from('mapica_locals')
        .select('id, display_name, status, verification_status, country_id, languages, completed_trips')
        .ilike('display_name', `%${q}%`)
        .limit(12);
      box.innerHTML = (data || []).map((l) =>
        `<button type="button" data-local="${l.id}">${esc(l.display_name)} · ${esc(l.status)}/${esc(l.verification_status)} · ${esc(l.country_id)} · ${(l.languages||[]).join(', ')} · trips ${esc(l.completed_trips)}</button>`
      ).join('') || '<p class="sub">No Locals</p>';
    });
  }

  async function runAction(act) {
    const id = path().split('/').pop();
    const err = $('#act-err');
    const confirmAct = async (msg) => window.confirm(msg);
    try {
      if (act === 'offer') {
        const localId = $('#offer-local').value.trim();
        const { error } = await sb.rpc('ops_offer_to_local', { p_trip_id: id, p_local_id: localId });
        if (error) throw error;
      } else if (act === 'assign') {
        const localId = $('#assign-local').value.trim();
        const reason = $('#assign-reason').value.trim();
        if (!await confirmAct(`Assign this Local to trip ${id.slice(0, 8)}? This bypasses Local acceptance and makes them the assigned creator.`)) return;
        const { error } = await sb.rpc('ops_assign_local', {
          p_trip_id: id, p_local_id: localId, p_reason: reason, p_assignment_type: 'manual',
        });
        if (error) throw error;
      } else if (act === 'assign-me') {
        const reason = $('#assign-reason').value.trim() || 'ops_override';
        if (!await confirmAct(`Assign trip ${id.slice(0, 8)} to your approved Local profile? You become the assigned creator.`)) return;
        const { error } = await sb.rpc('ops_assign_to_me', { p_trip_id: id, p_reason: reason });
        if (error) throw error;
      } else if (act === 'reassign') {
        const localId = $('#reassign-local').value.trim();
        const reason = $('#reassign-reason').value.trim();
        if (!await confirmAct(`Reassign this trip to a different Local? Previous assignment history is kept.`)) return;
        const { error } = await sb.rpc('ops_reassign_local', { p_trip_id: id, p_new_local_id: localId, p_reason: reason });
        if (error) throw error;
      } else if (act === 'prio') {
        const { error } = await sb.rpc('ops_set_priority', { p_trip_id: id, p_priority: $('#prio').value });
        if (error) throw error;
      } else if (act === 'take') {
        const { error } = await sb.rpc('ops_set_owner', { p_trip_id: id, p_owner: session.user.id });
        if (error) throw error;
      } else if (act === 'unavail') {
        if (!await confirmAct(`Mark trip ${id.slice(0, 8)} unavailable? Travelers will not be able to continue this request.`)) return;
        const { error } = await sb.rpc('ops_mark_unavailable', { p_trip_id: id, p_reason: 'other', p_note: null });
        if (error) throw error;
      } else if (act === 'note') {
        const body = $('#note-body').value.trim();
        const { error } = await sb.rpc('ops_add_note', { p_trip_id: id, p_body: body });
        if (error) throw error;
      }
      render();
    } catch (e) {
      if (err) err.textContent = e.message || String(e);
    }
  }

  window.addEventListener('popstate', render);
  {
    const qs = new URLSearchParams(location.search);
    const isOAuthCb = qs.has('code') || qs.has('error') || /access_token|error=/.test(location.hash || '');
    if (location.pathname.startsWith('/ops') && !isOAuthCb && location.pathname !== '/ops') {
      rememberReturnPath(location.pathname + location.search);
    }
  }
  render();
})();
