// Math Hub bridge for the Lesson Planner.
// At home (localhost) it does nothing, so the planner works exactly as before.
// Online (derrickdemars.org/planner):
//   - requires the Math Hub teacher sign-in (hub-state.js, loaded in index.html)
//   - saves plans to the Cloudflare Worker (batched, at most every 30 seconds) so they follow you to any device
//   - sends backups (at most every 15 minutes) and plugin-bridge.json to the Worker instead of localhost:5175
//   - turns off AI completion that needs the Claude app on your computer

const HOST = location.hostname;
const ONLINE = !(HOST === 'localhost' || HOST === '127.0.0.1' || HOST === '' || HOST.endsWith('.local'));
window.HUB_PLANNER_ONLINE = ONLINE;

const LOCAL = 'http://localhost:5175';
const KEYS = 'hubbridge:keys', DIRTY = 'hubbridge:dirty', LAST_BK = 'hubbridge:lastBackup';
const FLUSH_MS = 30 * 1000, BACKUP_MS = 15 * 60 * 1000;
const H = () => window.HubState;
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const serverOn = () => !!(H() && H().get().serverMode && H().token());
const jsonResponse = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function worker(path, init = {}) {
  if (!serverOn()) return Promise.resolve(jsonResponse({ error: 'The Math Hub server is not connected yet.' }, 503));
  const headers = { ...(init.headers || {}), Authorization: 'Bearer ' + H().token() };
  return fetch(H().apiBase + path, { ...init, headers });
}

// ---------- plan storage: localStorage + batched sync to the Worker ----------
let flushTimer = null, lastFlush = 0;
function markDirty(key) {
  const keys = new Set(read(KEYS, [])); keys.add(key); write(KEYS, [...keys]);
  const d = new Set(read(DIRTY, [])); d.add(key); write(DIRTY, [...d]);
  scheduleFlush();
}
function scheduleFlush() {
  if (flushTimer) return;
  const wait = Math.max(0, FLUSH_MS - (Date.now() - lastFlush));
  flushTimer = setTimeout(flush, wait);
}
function snapshot() {
  const items = {};
  for (const k of read(KEYS, [])) { const v = localStorage.getItem(k); if (v !== null) items[k] = v; }
  return items;
}
async function flush(keepalive) {
  flushTimer = null;
  if (!read(DIRTY, []).length || !serverOn()) return;
  lastFlush = Date.now();
  try {
    const r = await worker('/api/planner/store', { method: 'PUT', keepalive: !!keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot()) });
    if (r.ok) write(DIRTY, []);
  } catch (e) { scheduleFlush(); }
}
async function pull() {
  if (!serverOn()) return;
  try {
    const r = await worker('/api/planner/store');
    const d = await r.json();
    const dirty = new Set(read(DIRTY, []));
    const keys = new Set(read(KEYS, []));
    for (const [k, v] of Object.entries((d && d.items) || {})) { keys.add(k); if (!dirty.has(k)) localStorage.setItem(k, v); }
    write(KEYS, [...keys]);
    if (dirty.size) scheduleFlush();
  } catch (e) {}
}

// ---------- reroute calls meant for the home backup server ----------
function patchFetch() {
  const orig = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!url.startsWith(LOCAL)) return orig(input, init);
    const p = url.slice(LOCAL.length), method = (init.method || 'GET').toUpperCase();
    if (p.startsWith('/api/complete-')) return Promise.resolve(jsonResponse({ error: 'AI completion with the Claude app works on your home computer only.' }, 503));
    if (p === '/api/plugin-bridge') return worker('/api/planner/bridge');
    if (p === '/api/backups') return worker('/api/planner/backups');
    if (p === '/api/backup' && method === 'POST') {
      if (Date.now() - (read(LAST_BK, 0) || 0) < BACKUP_MS) return Promise.resolve(jsonResponse({ success: true, skipped: true }));
      write(LAST_BK, Date.now());
      return worker('/api/planner/backup', init);
    }
    if (p.startsWith('/api/backup/')) return worker('/api/planner/backup/' + p.slice('/api/backup/'.length), init);
    if (p.startsWith('/api/session/')) return worker('/api/planner/session/' + p.slice('/api/session/'.length), init);
    return Promise.resolve(jsonResponse({ error: 'Not available online.' }, 404));
  };
}

// ---------- sign-in gate (teacher only) ----------
let gateEl = null;
function showGate(message) {
  if (!gateEl) {
    gateEl = document.createElement('div');
    gateEl.setAttribute('role', 'dialog');
    gateEl.setAttribute('aria-label', 'Sign in');
    gateEl.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#131317;color:#f3f2ee;display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;';
    document.body.appendChild(gateEl);
  }
  let pin = '', busy = false, err = message || '';
  const render = () => {
    const dots = [0, 1, 2, 3].map(i => `<span style="width:56px;height:64px;border-radius:14px;border:2px solid ${i < pin.length ? '#f3f2ee' : '#33333c'};background:#27272f;display:grid;place-items:center;"><span style="width:16px;height:16px;border-radius:50%;background:${i < pin.length ? '#f3f2ee' : 'transparent'};"></span></span>`).join('');
    const key = (k, label) => `<button data-k="${k}" style="min-height:60px;border-radius:14px;border:2px solid #33333c;background:#1c1c22;color:#f3f2ee;font:inherit;font-size:24px;font-weight:700;cursor:pointer;">${label || k}</button>`;
    gateEl.innerHTML = `<div style="width:min(380px,100%);display:flex;flex-direction:column;gap:16px;align-items:center;text-align:center;">
      <div style="font-size:15px;font-weight:700;color:#b6b5bf;">Math Hub</div>
      <h1 style="margin:0;font-size:28px;">Lesson Planner</h1>
      <p style="margin:0;font-size:17px;color:#b6b5bf;">Enter your teacher PIN.</p>
      <div style="display:flex;gap:10px;">${dots}</div>
      <div role="status" style="min-height:24px;font-size:16px;font-weight:700;color:#ff9b8a;">${err}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;">${['1','2','3','4','5','6','7','8','9'].map(d => key(d)).join('')}${key('del', '&larr;')}${key('0')}<span></span></div>
      <a href="/" style="color:#f3f2ee;font-size:16px;">Go to the Math Hub</a>
    </div>`;
  };
  const press = k => {
    if (busy) return;
    if (k === 'del') pin = pin.slice(0, -1);
    else if (/^\d$/.test(k) && pin.length < 4) { pin += k; err = ''; }
    render();
    if (pin.length === 4) {
      busy = true;
      H().checkPin(pin).then(r => {
        busy = false; pin = '';
        if (r && r.ok && r.role !== 'teacher') { H().signOut(); err = 'The Lesson Planner is for the teacher only.'; }
        else if (!r || !r.ok) err = (r && r.message) || "That PIN didn't work. Try again.";
        render();
      });
    }
  };
  gateEl.onclick = e => { const b = e.target.closest && e.target.closest('[data-k]'); if (b) press(b.getAttribute('data-k')); };
  gateEl._key = e => { if (!gateEl || gateEl.style.display === 'none') return; if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
  window.removeEventListener('keydown', gateEl._prevKey || (() => {}));
  window.addEventListener('keydown', gateEl._key); gateEl._prevKey = gateEl._key;
  gateEl.style.display = 'flex';
  render();
}
function hideGate() { if (gateEl) gateEl.style.display = 'none'; }
const isTeacher = () => !!(H() && H().get().teacher);

// Resolves when the planner may render.
export const ready = (async () => {
  if (!ONLINE) return;
  if (!H()) { document.body.innerHTML = '<p style="font:18px sans-serif;padding:24px">The Math Hub sign-in did not load. Check that /hub-state.js is published.</p>'; return new Promise(() => {}); }
  H().setNoZoom(true); // the planner manages its own sizing
  // Typing counts as activity in the planner, so long editing sessions don't sign you out.
  window.addEventListener('keydown', () => H().touch(), { passive: true, capture: true });
  window.storage = {
    async get(key) { const v = localStorage.getItem(key); return v ? { value: v } : null; },
    async set(key, value) { localStorage.setItem(key, value); markDirty(key); },
    async remove(key) { localStorage.removeItem(key); const keys = read(KEYS, []).filter(k => k !== key); write(KEYS, keys); const d = new Set(read(DIRTY, [])); d.add(key); write(DIRTY, [...d]); scheduleFlush(); }
  };
  patchFetch();
  window.addEventListener('pagehide', () => flush(true));
  let wasTeacher = isTeacher();
  window.addEventListener('hubchange', () => {
    const t = isTeacher();
    if (t && !wasTeacher) { hideGate(); pull().then(() => { if (read(DIRTY, []).length) flush(); }); }
    if (!t && wasTeacher) showGate('You were signed out.');
    wasTeacher = t;
  });
  if (!isTeacher()) {
    showGate();
    await new Promise(res => { const on = () => { if (isTeacher()) { window.removeEventListener('hubchange', on); res(); } }; window.addEventListener('hubchange', on); });
    hideGate();
  }
  await pull();
})();
