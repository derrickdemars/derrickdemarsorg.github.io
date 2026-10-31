// Shared site state: reader settings + teacher sign-in, saved on this device.
(function () {
  // Silence "Transition was skipped" rejections from cross-page view transitions (e.g. on reload).
  function quiet(vt) { if (!vt) return; ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { if (vt[k] && vt[k].catch) vt[k].catch(function () {}); }); }
  window.addEventListener('pagereveal', function (e) { quiet(e.viewTransition); });
  // Only crossfade when the visitor clicked a link on this site; skip for reloads and other navigations.
  var linkNav = false;
  document.addEventListener('click', function (e) { var l = e.target.closest && e.target.closest('a[href]'); linkNav = !!(l && !l.target); }, true);
  window.addEventListener('pageswap', function (e) {
    var vt = e.viewTransition; if (!vt) return;
    quiet(vt);
    if (!linkNav) { try { vt.skipTransition(); } catch (x) {} }
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason, msg = r && (r.message || String(r));
    if ((r && r.name === 'AbortError' && /transition/i.test(msg)) || /Transition was skipped/i.test(msg || '')) e.preventDefault();
  });
  if (window.HubState) return;
  var KEY = 'demars-hub-v1';
  // SHA-256 of each role's PIN (the PINs themselves never appear in the code)
  var PINS = {
    '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0': 'teacher',
    '888b19a43b151683c87895f6211d9f8640f97bdc8ef32f03dbe057c8f5e56d32': 'sub'
  };
  // Sign-in rules: 30 min with no activity, 3:05 PM on school days (if signed in before then),
  // and closing the tab/browser (the session lives in sessionStorage).
  // Teacher: 30 min idle, 3:05 PM weekdays. Substitute: 15 min idle, 2:15 PM weekdays, weekdays only.
  // cutoffs: sign-out times; a session ends at the first one after it started. lastSignIn: no sign-in after this.
  var ROLES = { teacher: { idle: 30 * 60 * 1000, cutoffs: [{ h: 15, m: 5 }] }, sub: { idle: 30 * 60 * 1000, cutoffs: [{ h: 14, m: 15 }, { h: 15, m: 30 }], lastSignIn: { h: 15, m: 30 } } };
  var WARN_MS = 5 * 60 * 1000;
  // Server mode: paste your Worker address here (see SECURITY-SETUP.md). Blank = preview mode (PINs checked in the browser).
  var API_BASE = 'https://demars-hub.derrickdemars.workers.dev';
  var SERVER = !!API_BASE;
  var SESSION_KEY = 'demars-hub-session-v1';
  var STD = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  var DYS = '"OpenDyslexic", "Comic Sans MS", sans-serif';
  // [text on dark, text on light]
  var COURSE_TEXT = {
    g7: ['oklch(0.86 0.12 150)', 'oklch(0.46 0.12 150)'],
    g8: ['oklch(0.84 0.09 250)', 'oklch(0.47 0.14 255)'],
    alg1: ['oklch(0.86 0.11 60)', 'oklch(0.5 0.14 50)'],
    geo: ['oklch(0.83 0.1 300)', 'oklch(0.47 0.18 300)'],
    alg2: ['oklch(0.83 0.1 25)', 'oklch(0.5 0.18 25)'],
    alg3: ['oklch(0.92 0.12 95)', 'oklch(0.47 0.1 90)']
  };
  var COURSE_FILL = { g7: '0.74 0.17 150', g8: '0.69 0.15 250', alg1: '0.76 0.16 55', geo: '0.67 0.19 300', alg2: '0.67 0.2 25', alg3: '0.88 0.16 95' };
  var VT = 'onpagereveal' in window; // browser crossfades between pages itself
  function load() {
    var s = { theme: 'dark', font: 'standard', contrast: false, motion: true };
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) s.motion = false; } catch (e) {}
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v) { for (var k in v) if (k !== 'teacher' && k !== 'teacherUntil') s[k] = v[k]; }
    } catch (e) {}
    return s;
  }
  var state = load();
  function loadSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
  function saveSession(s) { try { if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }
  var HANDOFF_KEY = 'demars-hub-handoff-v1', SIGNOUT_KEY = 'demars-hub-signout-v1';
  var session = loadSession();
  // A tab opened from a signed-in hub tab picks up the sign-in (handoff lasts 15 seconds).
  if (!session) {
    try {
      var ho = JSON.parse(localStorage.getItem(HANDOFF_KEY) || 'null');
      if (ho && ho.exp > Date.now() && ho.s) { session = ho.s; session.lastActive = Date.now(); saveSession(session); }
      if (ho) localStorage.removeItem(HANDOFF_KEY);
    } catch (e) {}
  }
  var hold = false; // a Jeopardy board is open: pause the idle timer and defer the daily cutoff
  function dayKey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function cutoffFor(s, now) {
    var d = new Date(now), wd = d.getDay();
    if (wd === 0 || wd === 6) return Infinity;
    if (s.skipCutoffDay === dayKey(d)) return Infinity;
    var list = ROLES[s.role || 'teacher'].cutoffs;
    for (var i = 0; i < list.length; i++) {
      var c = new Date(d); c.setHours(list[i].h, list[i].m, 0, 0);
      if (c.getTime() > s.signedInAt) return c.getTime();
    }
    return Infinity;
  }
  function timing(now) {
    if (!session) return { left: 0, reason: '' };
    if (hold) return { left: Infinity, reason: '' };
    var idleAt = session.lastActive + ROLES[session.role || 'teacher'].idle, cutAt = cutoffFor(session, now);
    var t = cutAt < idleAt ? { left: cutAt - now, reason: 'cutoff' } : { left: idleAt - now, reason: 'idle' };
    if (SERVER && session.exp && session.exp - now < t.left) t.left = session.exp - now; // the server's word is final
    return t;
  }
  function view() {
    var t = timing(Date.now());
    var o = {}; for (var k in state) o[k] = state[k];
    var on = t.left > 0;
    o.role = on ? (session.role || 'teacher') : '';
    o.signedIn = on;
    o.teacher = on && o.role === 'teacher';
    o.sub = on && o.role === 'sub';
    o.serverMode = SERVER;
    o.teacherLeft = t.left === Infinity ? 0 : Math.max(0, t.left);
    o.signOutReason = t.reason;
    o.signOutSoon = t.left > 0 && t.left <= WARN_MS;
    return o;
  }
  function vars(s) {
    var light = s.theme === 'light';
    var p = light
      ? (s.contrast ? { bg: '#ffffff', surface: '#ffffff', surface2: '#efefef', line: '#1a1a1a', ink: '#000000', muted: '#1f1f1f' }
                    : { bg: '#f5f4f0', surface: '#ffffff', surface2: '#ebeae5', line: '#d6d5cf', ink: '#18181d', muted: '#4b4b55' })
      : (s.contrast ? { bg: '#000000', surface: '#0a0a0a', surface2: '#1a1a1a', line: '#e0e0e0', ink: '#ffffff', muted: '#f0f0f0' }
                    : { bg: '#131317', surface: '#1c1c22', surface2: '#27272f', line: '#33333c', ink: '#f3f2ee', muted: '#b6b5bf' });
    var dys = s.font === 'dys';
    var out = {
      '--bg': p.bg, '--surface': p.surface, '--surface2': p.surface2, '--line': p.line, '--ink': p.ink, '--muted': p.muted,
      '--font': dys ? DYS : STD, '--lh': dys ? '1.65' : '1.5', '--ls': dys ? '0.02em' : '0',
      '--lift': s.motion ? '-3px' : '0px', '--dur': s.motion ? '150ms' : '0ms',
      '--grow': s.motion ? '1.02' : '1', '--fade': !s.motion || VT ? '0ms' : '300ms', '--vt': s.motion ? '280ms' : '0ms', '--shape-hover': s.motion ? '0.34' : '0.22',
      '--glow': !s.motion ? 'none' : s.contrast ? '0 0 0 4px ' + p.ink : light ? '0 6px 18px rgba(20,20,30,0.14)' : '0 0 0 1px rgba(255,255,255,0.12), 0 0 20px rgba(255,255,255,0.12)',
      '--tileborder': s.contrast ? '3px solid ' + p.ink : '0px solid transparent'
    };
    for (var id in COURSE_TEXT) out['--t-' + id] = COURSE_TEXT[id][light ? 1 : 0];
    for (var ci in COURSE_FILL) out['--ci-' + ci] = !s.motion ? 'none' : s.contrast ? 'inset 0 0 0 4px ' + p.ink : light ? 'inset 0 0 0 2px rgba(20,20,30,0.18), inset 0 2px 12px rgba(20,20,30,0.10)' : 'inset 0 0 0 2px oklch(' + COURSE_FILL[ci] + ' / 0.6), inset 0 0 22px oklch(' + COURSE_FILL[ci] + ' / 0.28)';
    for (var c in COURSE_FILL) out['--cg-' + c] = (!s.motion || s.contrast || light) ? out['--glow'] : '0 0 0 1px oklch(' + COURSE_FILL[c] + ' / 0.5), 0 0 24px oklch(' + COURSE_FILL[c] + ' / 0.3)';
    return out;
  }
  function apply() {
    var r = document.documentElement, v = vars(state);
    for (var k in v) r.style.setProperty(k, v[k]);
    r.style.colorScheme = state.theme === 'light' ? 'light' : 'dark';
  }
  function emit() { window.dispatchEvent(new CustomEvent('hubchange', { detail: view() })); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function set(patch) {
    var n = {}; for (var k in state) n[k] = state[k];
    for (var j in patch) {
      if (j === 'teacher' || j === 'signedIn') {
        var now = Date.now(); session = patch[j] ? { role: patch.role || 'teacher', signedInAt: now, lastActive: now, skipCutoffDay: null } : null; saveSession(session);
        if (!patch[j]) { try { localStorage.setItem(SIGNOUT_KEY, String(now)); } catch (e) {} } // sign out every open hub tab
      }
      else if (j === 'role') {}
      else n[j] = patch[j];
    }
    state = n; save(); apply(); emit();
  }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  // Substitutes may sign in Monday to Friday, before 3:30 PM.
  function subAllowed(now) {
    var d = new Date(now), wd = d.getDay();
    if (wd === 0 || wd === 6) return 'Substitute sign-in is available Monday through Friday.';
    var L = ROLES.sub.lastSignIn, c = new Date(d); c.setHours(L.h, L.m, 0, 0);
    if (now >= c.getTime()) return 'Substitute sign-in ends at 3:30 PM. Try again next school day.';
    return '';
  }
  // Resolves { ok, role, message }
  function checkPin(pin) {
    if (SERVER) {
      return fetch(API_BASE + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: String(pin) }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.ok) return { ok: false, role: d.role, message: d.message || "That PIN didn't work. Try again." };
          var now = Date.now();
          session = { role: d.role, signedInAt: now, lastActive: now, skipCutoffDay: null, token: d.token, exp: d.exp, refreshedAt: now };
          saveSession(session); emit();
          return { ok: true, role: d.role };
        })
        .catch(function () { return { ok: false, message: "Can't reach the sign-in server. Check the internet connection." }; });
    }
    if (!window.crypto || !crypto.subtle) return Promise.resolve({ ok: false, message: "That PIN didn't work. Try again." });
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pin))).then(function (b) {
      var role = PINS[hex(b)];
      if (!role) return { ok: false, message: "That PIN didn't work. Try again." };
      if (role === 'sub') { var why = subAllowed(Date.now()); if (why) return { ok: false, role: role, message: why }; }
      set({ signedIn: true, role: role });
      return { ok: true, role: role };
    });
  }
  // Activity keeps the session alive (typing is intentionally not counted).
  var lastWrite = 0;
  function touch() {
    if (!session || !view().signedIn) return;
    var now = Date.now();
    session.lastActive = now;
    if (now - lastWrite > 5000) { lastWrite = now; saveSession(session); }
    if (SERVER && now - (session.refreshedAt || 0) > 60000) refresh(false);
  }
  // Server mode: trade the token for a fresh one so the server's 30-minute window follows activity.
  function refresh(skipCutoff) {
    if (!SERVER || !session || !session.token) return Promise.resolve();
    session.refreshedAt = Date.now();
    return api('/api/refresh', { method: 'POST', body: JSON.stringify({ skipCutoff: !!skipCutoff }), headers: { 'Content-Type': 'application/json' } })
      .then(function (d) { if (d && d.ok && session) { session.token = d.token; session.exp = d.exp; saveSession(session); emit(); } });
  }
  // Authorized call to the Worker. A 401 means the server signed us out.
  function api(path, opts) {
    if (!SERVER) return Promise.reject(new Error('preview'));
    opts = opts || {};
    var h = opts.headers || {};
    if (session && session.token) h.Authorization = 'Bearer ' + session.token;
    opts.headers = h;
    return fetch(API_BASE + path, opts).then(function (r) {
      if (r.status === 401) { session = null; saveSession(null); emit(); }
      return (r.headers.get('Content-Type') || '').indexOf('json') >= 0 ? r.json() : r;
    });
  }
  ['mousemove', 'pointerdown', 'click', 'scroll', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, touch, { passive: true, capture: true }); });
  if (session && timing(Date.now()).left > 0) { session.lastActive = Date.now(); saveSession(session); } // opening a hub page counts
  else if (session) { session = null; saveSession(null); }
  // Auto sign-out + live countdown in the last 5 minutes
  var wasIn = view().signedIn, ticks = 0;
  setInterval(function () {
    var v = view(); ticks++;
    if (wasIn && !v.signedIn) { session = null; saveSession(null); wasIn = false; emit(); return; }
    wasIn = v.signedIn;
    if (v.signOutSoon || ticks % 15 === 0) emit();
    if (hold && session && ticks % 10 === 0) { session.lastActive = Date.now(); saveSession(session); } // the game counts as activity
    if (hold && SERVER && session && Date.now() - (session.refreshedAt || 0) > 5 * 60000) refresh(false);
  }, 1000);
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { state = load(); apply(); emit(); }
    if (e.key === SIGNOUT_KEY && session) { session = null; saveSession(null); emit(); }
  });
  // Links that open a new tab carry the sign-in with them.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href][target="_blank"]');
    if (!a || !session || !view().signedIn) return;
    try { if (new URL(a.href, location.href).origin !== location.origin) return; localStorage.setItem(HANDOFF_KEY, JSON.stringify({ s: session, exp: Date.now() + 15000 })); } catch (x) {}
  }, true);
  // Design preview: narrow every page to phone width (set from Home's Tweaks panel).
  var PREVIEW_KEY = 'demars-hub-preview-v1';
  // Small screens (under 900px) shrink the whole page to 80% so text, icons and spacing stay in proportion.
  var SMALL = 900, SMALL_ZOOM = 0.8;
  function isPhonePreview() { try { return localStorage.getItem(PREVIEW_KEY) === 'phone'; } catch (e) { return false; } }
  function applyLayout() {
    var b = document.body; if (!b) return;
    var phone = isPhonePreview();
    var w = phone ? 390 : window.innerWidth;
    var z = (w < SMALL && !document.documentElement.hasAttribute('data-hub-nozoom')) ? SMALL_ZOOM : 1;
    b.style.zoom = z === 1 ? '' : String(z);
    b.style.maxWidth = phone ? (390 / z) + 'px' : '';
    b.style.margin = phone ? '0 auto' : '';
    b.style.boxShadow = phone ? '0 0 0 1px var(--line)' : '';
    b.style.minHeight = phone ? (100 / z) + 'vh' : '';
  }
  function applyPreview() { applyLayout(); window.dispatchEvent(new Event('resize')); }
  window.addEventListener('resize', applyLayout);
  if (document.body) applyPreview(); else document.addEventListener('DOMContentLoaded', applyPreview);
  window.HubState = {
    setNoZoom: function (on) {
      var r = document.documentElement, has = r.hasAttribute('data-hub-nozoom');
      if (!!on === has) return;
      if (on) r.setAttribute('data-hub-nozoom', ''); else r.removeAttribute('data-hub-nozoom');
      applyPreview();
    },
    setPhonePreview: function (on) {
      try { if (on) localStorage.setItem(PREVIEW_KEY, 'phone'); else localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
      applyPreview();
    },
    get: view,
    set: set,
    apply: apply,
    checkPin: checkPin,
    extend: function () {
      if (!session) return;
      var now = Date.now();
      session.lastActive = now;
      var skip = session.role !== 'sub' && (timing(now).reason === 'cutoff' || cutoffFor(session, now) - now <= WARN_MS);
      if (skip) session.skipCutoffDay = dayKey(new Date(now));
      saveSession(session); emit();
      refresh(skip);
    },
    signOut: function () { set({ signedIn: false }); },
    // Pause the idle timer and defer the daily sign-out while a game board is open.
    holdIdle: function (on) {
      hold = !!on;
      if (!on && session) { session.lastActive = Date.now(); saveSession(session); }
      emit();
    },
    api: api,
    apiBase: API_BASE,
    touch: function () { touch(); },
    token: function () { return session && session.token ? session.token : ''; },
    fileUrl: function (name) { return SERVER && session ? API_BASE + '/api/file/' + encodeURIComponent(name) + '?t=' + encodeURIComponent(session.token) : ''; },
    openSignin: function (opts) { window.dispatchEvent(new CustomEvent('hub-signin', { detail: opts || {} })); }
  };
  // Fallback for browsers without page view transitions: fade out before leaving
  document.addEventListener('click', function (e) {
    if (VT || !state.motion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    var b = document.body;
    b.style.transition = 'opacity 180ms cubic-bezier(0.45,0,0.55,1)';
    b.style.opacity = '0';
    setTimeout(function () { location.href = url.href; }, 180);
  });
  window.addEventListener('pageshow', function () { document.body && (document.body.style.opacity = ''); });
  apply();
  window.dispatchEvent(new Event('hubstate-ready'));
})();
