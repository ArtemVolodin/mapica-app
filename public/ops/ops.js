/* MAPICA OPS — staff console. Auth + RLS + RPCs are the security boundary. */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $('#app');
  let sb = null;
  let session = null;
  let staff = null;
  let idleTimer = null;
  const IDLE_MS = 8 * 60 * 60 * 1000;

  const routes = [
    [/^\/ops\/?$/, 'overview'],
    [/^\/ops\/personal-trips\/?$/, 'trips'],
    [/^\/ops\/personal-trips\/([^/]+)\/?$/, 'trip'],
    [/^\/ops\/locals\/?$/, 'locals'],
    [/^\/ops\/locals\/([^/]+)\/?$/, 'local'],
    [/^\/ops\/local-applications\/?$/, 'apps'],
    [/^\/ops\/local-applications\/([^/]+)\/?$/, 'app'],
    [/^\/ops\/alerts\/?$/, 'alerts'],
    [/^\/ops\/audit\/?$/, 'audit'],
    [/^\/ops\/staff\/?$/, 'staff'],
  ];

  function path() {
    const p = location.pathname.replace(/\/+$/, '') || '/ops';
    return p.startsWith('/ops') ? p : '/ops';
  }

  function go(href, replace) {
    history[replace ? 'replaceState' : 'pushState']({}, '', href);
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

  function remaining(due) {
    if (!due) return 'N/A';
    const ms = new Date(due).getTime() - Date.now();
    if (ms < 0) return 'Overdue';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  function layout(body) {
    const role = staff?.role || '';
    return `<div class="app">
      <nav class="nav">
        <div class="brand">MAPICA OPS</div>
        <a href="/ops" class="${path() === '/ops' ? 'active' : ''}">Overview</a>
        <a href="/ops/personal-trips" class="${path().includes('/personal-trips') ? 'active' : ''}">Personal Trips</a>
        <a href="/ops/locals" class="${path().includes('/locals') && !path().includes('application') ? 'active' : ''}">Locals</a>
        <a href="/ops/local-applications" class="${path().includes('application') ? 'active' : ''}">Applications</a>
        <a href="/ops/alerts" class="${path().includes('/alerts') ? 'active' : ''}">Alerts</a>
        <a href="/ops/audit" class="${path().includes('/audit') ? 'active' : ''}">Audit</a>
        ${role === 'admin' ? `<a href="/ops/staff" class="${path().includes('/staff') ? 'active' : ''}">Staff</a>` : ''}
        <div class="grow"></div>
        <div class="sub" style="margin:8px">${esc(session?.user?.email || '')}<br>${esc(role)}</div>
        <button class="link" id="logout">Log out</button>
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
      <div class="brand">MAPICA OPS</div>
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
      bind();
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
      bind();
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
    const { data: attn } = await sb.from('trips').select('id, status, ops_reason, created_at, request_id, ops_priority')
      .eq('status', 'ops_review').order('created_at', { ascending: true }).limit(20);
    return layout(`
      <h1>Overview</h1>
      <p class="sub">${error ? esc(error.message) : 'Operational control center'}</p>
      <div class="cards">
        ${card(s.personal_trips_today, 'Personal Trips today')}
        ${card(s.matching_now, 'Matching now')}
        ${card(s.needs_attention, 'Needs attention')}
        ${card(s.local_confirmed, 'Local confirmed')}
        ${card(s.awaiting_payment, 'Awaiting payment')}
        ${card(s.in_progress, 'In progress')}
        ${card(s.ready_today, 'Ready today')}
        ${card(s.overdue, 'Overdue')}
      </div>
      <div class="cards">
        ${card((s.automatic_pct ?? 0) + '%', 'Automatic assignment')}
        ${card((s.manual_pct ?? 0) + '%', 'Manual assignment')}
        ${card((s.self_assign_pct ?? 0) + '%', 'Self-assignment')}
        ${card((s.no_candidate_pct ?? 0) + '%', 'No candidate')}
        ${card((s.all_declined_pct ?? 0) + '%', 'All declined')}
        ${card((s.match_timeout_pct ?? 0) + '%', 'Match timeout')}
        ${card(s.median_match_minutes != null ? Math.round(s.median_match_minutes) + 'm' : 'N/A', 'Median match time')}
        ${card(s.median_ops_minutes != null ? Math.round(s.median_ops_minutes) + 'm' : 'N/A', 'Median Ops resolution')}
        ${card((s.sla_success_pct ?? 0) + '%', '24h SLA success')}
        ${card(s.open_requests, 'Open requests')}
        ${card(s.zero_candidates, 'Zero candidates (30d)')}
        ${card(s.open_alerts, 'Open alerts')}
      </div>
      <h2>Ops reasons (30 days)</h2>
      <div class="reasons">${Object.entries(s.ops_reasons || {}).map(([k, v]) => `<span>${esc(k)} · ${esc(v)}</span>`).join('') || '<span>N/A</span>'}</div>
      <h2>Needs attention</h2>
      <div class="table-wrap"><table><thead><tr><th>Trip</th><th>Priority</th><th>Reason</th><th>Created</th></tr></thead>
      <tbody>${(attn || []).map((t) => `<tr data-href="/ops/personal-trips/${t.id}"><td>${esc(t.id.slice(0, 8))}</td><td>${esc(t.ops_priority)}</td><td>${esc(t.ops_reason || '—')}</td><td>${fmt(t.created_at)}</td></tr>`).join('') || '<tr><td colspan="4">None</td></tr>'}</tbody></table></div>
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
        <td>${esc(t.ops_priority)}</td>
        <td>${noted.has(t.id) ? 'Yes' : '—'}</td>
      </tr>`;
    }).join('');
    return layout(`
      <h1>Personal Trips</h1>
      <p class="sub">Default: needs attention first, then oldest waiting request.</p>
      <form class="filters" id="trip-filters">
        <select name="status">
          <option value="">All statuses</option>
          ${['requested','matching','offered','ops_review','local_confirmed','awaiting_payment','planning','ready','unavailable'].map((s) => `<option ${status===s?'selected':''} value="${s}">${s}</option>`).join('')}
        </select>
        <select name="assignment">
          <option value="">Assignment type</option>
          ${['automatic','manual','manual_self'].map((s) => `<option ${q.get('assignment')===s?'selected':''} value="${s}">${s}</option>`).join('')}
        </select>
        <label><input type="checkbox" name="unassigned" value="1" ${q.get('unassigned')==='1'?'checked':''}/> Unassigned</label>
        <label><input type="checkbox" name="attn" value="1" ${q.get('attn')==='1'?'checked':''}/> Needs attention</label>
        <label><input type="checkbox" name="overdue" value="1" ${q.get('overdue')==='1'?'checked':''}/> Overdue</label>
        <input name="q" placeholder="Search ID / traveler / email / Local / destination" value="${esc(q.get('q') || '')}" />
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
        <tbody>${body || '<tr><td colspan="36">No trips</td></tr>'}</tbody>
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
      <h1>Request ${esc(id.slice(0, 8))}</h1>
      <p class="sub">${pill(t.status)} · priority ${esc(t.ops_priority)} · ${esc(t.ops_reason || 'no ops reason')}</p>
      <div class="grid2">
        <div>
          <div class="section card"><h2>Request</h2>
            <p>Request ID ${esc(t.request_id)}<br>Trip ID ${esc(t.id)}<br>Created ${fmt(t.created_at)}</p></div>
          <div class="section card"><h2>Traveler</h2>
            <p>${esc(profile?.display_name)}<br>${esc(profile?.email)}<br>Language ${esc(profile?.language_code)}<br>Account ${esc(t.user_id)}</p></div>
          <div class="section card"><h2>Trip</h2>
            <p>${esc(dest)}<br>${esc(req?.start_date)} – ${esc(req?.end_date)}<br>Party ${esc(req?.traveler_count)} · ${esc(req?.traveler_type)}<br>Budget ${esc(req?.budget)} · pace ${esc(req?.pace)}<br>${esc(req?.user_message || '')}</p></div>
          <div class="section card"><h2>Matching / assignment</h2>
            <p>Type ${esc(t.assignment_type || '—')}<br>Assigned ${esc(local?.display_name || '—')}<br>Confirmed ${fmt(t.local_confirmed_at)}</p>
            <table><thead><tr><th>Local</th><th>Status</th><th>Type</th><th>Offered</th><th>Expires</th></tr></thead>
            <tbody>${(assigns || []).map((a) => `<tr><td>${esc(a.local_id.slice(0,8))}</td><td>${esc(a.status)}</td><td>${esc(a.assignment_type)}</td><td>${fmt(a.offered_at)}</td><td>${fmt(a.expires_at)}</td></tr>`).join('')}</tbody></table>
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
            <button class="btn" data-act="offer">Offer to Local</button>
            <hr style="border:0;border-top:1px solid var(--line);margin:14px 0" />
            <input id="assign-local" class="field" placeholder="Local id to assign" />
            <select id="assign-reason" class="field">
              <option value="">Assignment reason</option>
              <option>already_confirmed_offline</option>
              <option>ops_override</option>
              <option>creator_requested</option>
              <option>other</option>
            </select>
            <button class="btn" data-act="assign">Assign Local</button>
            ${canSelf ? `<button class="btn secondary" data-act="assign-me">Assign to me</button>` : ''}
            <hr style="border:0;border-top:1px solid var(--line);margin:14px 0" />
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
            <button class="btn secondary" data-act="reassign">Reassign</button>
            <hr style="border:0;border-top:1px solid var(--line);margin:14px 0" />
            <select id="prio" class="field">${['normal','high','urgent'].map((p)=>`<option ${t.ops_priority===p?'selected':''}>${p}</option>`).join('')}</select>
            <button class="btn secondary" data-act="prio">Set priority</button>
            <button class="btn secondary" data-act="take">Take ownership</button>
            <button class="btn danger" data-act="unavail">Mark unavailable</button>
            <p class="err" id="act-err"></p>
          </div>
          <div class="section card"><h2>Internal notes</h2>
            ${(notes || []).map((n) => `<div class="note">${esc(n.body)}<br><time>${fmt(n.created_at)}</time></div>`).join('') || '<p class="sub">None</p>'}
            <textarea id="note-body" rows="3" placeholder="Staff-only note"></textarea>
            <button class="btn secondary" data-act="note">Add note</button>
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
    return layout(`<h1>Locals</h1>
      <div class="table-wrap"><table><thead><tr><th>Local ID</th><th>Name</th><th>Email</th><th>Status</th><th>Approved</th><th>Country</th><th>Languages</th><th>Completed</th><th>Rating</th><th>Created</th></tr></thead>
      <tbody>${(data || []).map((l) => `<tr data-href="/ops/locals/${l.id}"><td>${esc(l.id.slice(0,8))}</td><td>${esc(l.display_name)}</td><td>${esc(pBy[l.user_id]?.email || '—')}</td><td>${esc(l.status)}</td><td>${esc(l.verification_status)}</td><td>${esc(l.country_id)}</td><td>${esc((l.languages||[]).join(', '))}</td><td>${esc(l.completed_trips)}</td><td>${esc(l.rating ?? 'N/A')}</td><td>${fmt(l.created_at)}</td></tr>`).join('')}</tbody></table></div>`);
  }

  async function localDetail(id) {
    const { data: l } = await sb.from('mapica_locals').select('*').eq('id', id).maybeSingle();
    const { data: assigns } = await sb.from('local_assignments').select('id, trip_id, status, assignment_type, created_at').eq('local_id', id).order('created_at', { ascending: false }).limit(50);
    return layout(`<h1>${esc(l?.display_name || 'Local')}</h1>
      <p>${pill(l?.status)} · verification ${esc(l?.verification_status)} · ${esc(l?.country_id)}</p>
      <div class="section card"><h2>Profile</h2>
        <p>Languages ${(l?.languages || []).join(', ') || 'N/A'}<br>About ${esc(l?.about || 'N/A')}<br>Completed ${esc(l?.completed_trips)} · rating ${esc(l?.rating ?? 'N/A')}</p>
        ${staff.role === 'ops_manager' || staff.role === 'admin' ? `
          <button class="btn danger" data-act-local="deactivate">Deactivate Local</button>
          <button class="btn secondary" data-act-local="reactivate">Reactivate</button>
          <p class="err" id="local-act-err"></p>
        ` : ''}
      </div>
      <div class="section card"><h2>Assignment history</h2>
      <table><thead><tr><th>Trip</th><th>Status</th><th>Type</th><th>When</th></tr></thead>
      <tbody>${(assigns || []).map((a) => `<tr data-href="/ops/personal-trips/${a.trip_id}"><td>${esc(a.trip_id.slice(0,8))}</td><td>${esc(a.status)}</td><td>${esc(a.assignment_type)}</td><td>${fmt(a.created_at)}</td></tr>`).join('')}</tbody></table></div>`);
  }

  async function appsView() {
    const { data } = await sb.from('local_applications').select('id, user_id, status, verification_status, created_at').order('created_at', { ascending: false }).limit(100);
    return layout(`<h1>Local applications</h1>
      <p class="sub">Review, request more info, approve, or decline. Every action is audited.</p>
      <div class="table-wrap"><table><thead><tr><th>ID</th><th>User</th><th>Status</th><th>Verification</th><th>Created</th></tr></thead>
      <tbody>${(data || []).map((a) => `<tr data-href="/ops/local-applications/${a.id}"><td>${esc(a.id.slice(0,8))}</td><td>${esc(a.user_id.slice(0,8))}</td><td>${esc(a.status)}</td><td>${esc(a.verification_status)}</td><td>${fmt(a.created_at)}</td></tr>`).join('')}</tbody></table></div>`);
  }

  async function appDetail(id) {
    const { data: a } = await sb.from('local_applications').select('*').eq('id', id).maybeSingle();
    if (!a) return layout('<h1>Not found</h1>');
    const { data: profile } = await sb.from('profiles').select('display_name, email').eq('id', a.user_id).maybeSingle();
    const payload = JSON.stringify(a.payload || {}, null, 2);
    return layout(`<h1>Application ${esc(id.slice(0, 8))}</h1>
      <p>${pill(a.status)} · ${esc(a.verification_status)} · ${esc(profile?.display_name || '')} · ${esc(profile?.email || '')}</p>
      <div class="section card"><h2>Payload</h2><pre style="white-space:pre-wrap;font-size:12px">${esc(payload)}</pre></div>
      <div class="section card"><h2>Review</h2>
        <textarea id="app-note" rows="3" placeholder="Note for decline / more info">${esc(a.staff_request_note || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn" data-app="approve">Approve Local</button>
          <button class="btn secondary" data-app="request_info">Request more info</button>
          <button class="btn danger" data-app="decline">Decline</button>
        </div>
        <p class="err" id="app-err"></p>
      </div>`);
  }

  async function alertsView() {
    const { data } = await sb.from('ops_alerts').select('*').order('created_at', { ascending: false }).limit(100);
    return layout(`<h1>Alerts</h1>
      <div class="table-wrap"><table><thead><tr><th>Type</th><th>Severity</th><th>Status</th><th>Trip</th><th>Created</th><th></th></tr></thead>
      <tbody>${(data || []).map((a) => `<tr>
        <td>${esc(a.alert_type)}</td><td>${esc(a.severity)}</td><td>${pill(a.status)}</td>
        <td>${a.trip_id ? `<a href="/ops/personal-trips/${a.trip_id}">${esc(a.trip_id.slice(0,8))}</a>` : '—'}</td>
        <td>${fmt(a.created_at)}</td>
        <td>${a.status === 'open' ? `<button class="btn secondary" data-ack="${a.id}">Ack</button>` : ''}</td>
      </tr>`).join('')}</tbody></table></div>`);
  }

  async function auditView() {
    const { data } = await sb.from('ops_audit_log').select('*').order('occurred_at', { ascending: false }).limit(200);
    return layout(`<h1>Audit log</h1>
      <p class="sub">Append-only. Staff cannot update or delete these rows.</p>
      <div class="table-wrap"><table><thead><tr><th>Timestamp</th><th>Actor</th><th>Role</th><th>Action</th><th>Resource</th><th>Trip</th><th>Reason</th></tr></thead>
      <tbody>${(data || []).map((a) => `<tr>
        <td>${fmt(a.occurred_at)}</td><td>${esc((a.actor_user_id || '').slice(0,8))}</td><td>${esc(a.actor_role)}</td>
        <td>${esc(a.action)}</td><td>${esc(a.resource_type)} ${esc(a.resource_id || '')}</td>
        <td>${a.trip_id ? esc(a.trip_id.slice(0,8)) : '—'}</td><td>${esc(a.reason || '')}</td>
      </tr>`).join('')}</tbody></table></div>`);
  }

  async function staffView() {
    if (staff.role !== 'admin') return layout('<h1>Admin only</h1>');
    const { data } = await sb.from('staff_users').select('*').order('created_at');
    return layout(`<h1>Staff</h1>
      <div class="card">
        <label>Authorize existing account (user uuid)</label>
        <input id="staff-id" class="field" placeholder="user uuid" />
        <select id="staff-role" class="field"><option>ops_agent</option><option>ops_manager</option><option>admin</option></select>
        <button class="btn" id="staff-add">Save role</button>
        <p class="err" id="staff-err"></p>
      </div>
      <div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Active</th><th>Last login</th><th>Created</th></tr></thead>
      <tbody>${(data || []).map((s) => `<tr><td>${esc(s.user_id)}</td><td>${esc(s.role)}</td><td>${s.active}</td><td>${fmt(s.last_login_at)}</td><td>${fmt(s.created_at)}</td></tr>`).join('')}</tbody></table></div>
      <p class="sub">MFA: enable TOTP in Supabase Dashboard → Authentication → Multi-Factor. Ops does not treat MFA as active until that is configured.</p>`);
  }

  async function render() {
    try {
      if (!sb) await initClient();
      await loadStaff();
      if (!session) {
        const params = new URLSearchParams(location.search);
        if (params.get('error') || /error=/.test(location.hash || '')) {
          const desc = params.get('error_description') || params.get('error') || 'Google sign-in was cancelled.';
          history.replaceState({}, '', '/ops');
          app.innerHTML = loginView(desc);
          bind();
          return;
        }
        // Never fetch Ops data before auth.
        app.innerHTML = loginView();
        bind();
        return;
      }
      {
        const stopped = await finishAuthNavigation();
        if (stopped) return;
      }
      const p = path();
      if (!staff) {
        // Authenticated but not staff — Access Denied, zero privileged queries.
        app.innerHTML = denied();
        bind();
        return;
      }
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
        else if (name === 'audit') html = await auditView();
        else if (name === 'staff') html = await staffView();
        break;
      }
      app.innerHTML = html || await overview();
      bind();
    } catch (e) {
      app.innerHTML = loginView(e.message || String(e));
      bind();
    }
  }

  function bind() {
    document.querySelectorAll('a[href^="/ops"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        go(a.getAttribute('href'));
      });
    });
    document.querySelectorAll('tr[data-href]').forEach((tr) => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => go(tr.getAttribute('data-href')));
    });
    $('#logout')?.addEventListener('click', async () => {
      session = null;
      staff = null;
      clearTimeout(idleTimer);
      sessionStorage.removeItem('ops_next');
      await sb.auth.signOut();
      app.innerHTML = loginView();
      bind();
      history.replaceState({}, '', '/ops');
    });
    $('#google-login')?.addEventListener('click', async (e) => {
      await startGoogleLogin(e.currentTarget);
    });
    $('#login-form')?.addEventListener('submit', async (e) => {
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
        bind();
        return;
      }
      const next = takeReturnPath();
      go(next, true);
    });
    $('#trip-filters')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const params = new URLSearchParams();
      for (const [k, v] of fd.entries()) {
        if (v) params.set(k, String(v));
      }
      const qs = params.toString();
      go('/ops/personal-trips' + (qs ? '?' + qs : ''));
    });
    $('#local-search')?.addEventListener('input', async (e) => {
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
      box.querySelectorAll('[data-local]').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.getAttribute('data-local');
          ['offer-local', 'assign-local', 'reassign-local'].forEach((fid) => {
            const el = document.getElementById(fid);
            if (el) el.value = id;
          });
        });
      });
    });
    document.querySelectorAll('[data-app]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-app');
        const note = $('#app-note')?.value || '';
        const id = path().split('/').pop();
        const msg = action === 'approve'
          ? `Approve this applicant as a Mapica Local? This creates or updates their Local profile.`
          : action === 'decline'
            ? `Decline this Local application? The applicant will not become a Local.`
            : `Request more information from this applicant?`;
        if (!window.confirm(msg)) return;
        const { error } = await sb.rpc('ops_review_local_application', {
          p_application_id: id, p_action: action, p_note: note || null,
        });
        const err = $('#app-err');
        if (error && err) err.textContent = error.message;
        else render();
      });
    });
    document.querySelectorAll('[data-act-local]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = path().split('/').pop();
        const active = btn.getAttribute('data-act-local') === 'reactivate';
        const msg = active
          ? 'Reactivate this Local so they can receive offers again?'
          : 'Deactivate this Local? They will no longer be eligible for matching or assignment.';
        if (!window.confirm(msg)) return;
        const reason = window.prompt('Reason (required)') || '';
        const { error } = await sb.rpc('ops_set_local_active', {
          p_local_id: id, p_active: active, p_reason: reason,
        });
        const err = $('#local-act-err');
        if (error && err) err.textContent = error.message;
        else render();
      });
    });
    document.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => runAction(btn.getAttribute('data-act')));
    });
    document.querySelectorAll('[data-ack]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await sb.rpc('ops_ack_alert', { p_alert_id: btn.getAttribute('data-ack') });
        render();
      });
    });
    $('#staff-add')?.addEventListener('click', async () => {
      const id = $('#staff-id').value.trim();
      const role = $('#staff-role').value;
      const { error } = await sb.rpc('ops_upsert_staff', { p_user_id: id, p_role: role, p_active: true });
      $('#staff-err').textContent = error ? error.message : 'Saved';
      if (!error) render();
    });
    document.addEventListener('click', bumpIdle, { once: true });
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
