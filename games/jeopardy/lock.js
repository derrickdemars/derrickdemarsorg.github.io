(function () {
  if (window.JPLock) return;
  // Jeopardy uses the Math Hub sign-in (hub-state.js): same PINs, roles and sign-out rules.
  var SCHOOL = 'Innova Preparatory School';
  var WARN_MS = 5 * 60 * 1000;
  var H = window.HubState;
  if (!H) { console.warn('lock.js: hub-state.js must load first'); }
  function view() { return H ? H.get() : { signedIn: false, teacherLeft: 0 }; }
  function isUnlocked() { return !!view().signedIn; }
  function remaining() { return view().teacherLeft || 0; }
  function emit() { window.dispatchEvent(new CustomEvent('jp-lock-change', { detail: { unlocked: isUnlocked() } })); }
  function lock() { if (H) H.signOut(); emit(); }
  function cooldown() { return 0; }
  // Resolves { ok, message }
  function unlock(pin) { return H ? H.checkPin(String(pin || '').trim()) : Promise.resolve({ ok: false, message: 'Sign-in is unavailable.' }); }
  function setPin() { return 'Change PINs on the Math Hub Settings page.'; }
  var was = isUnlocked();
  window.addEventListener('hubchange', function () { var u = isUnlocked(); if (u !== was) { was = u; emit(); } });
  if (H) {
    H.setNoZoom(true); // keep the board full size on small screens
    if (/\/Play\.dc\.html$/.test(decodeURIComponent(location.pathname))) H.holdIdle(true); // a game board is open
  }

  var CSS = '' +
    ':host{display:block}' +
    '.wrap{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:24px;font-family:var(--jp-font);color:var(--jp-text);font-size:calc(16px * var(--jp-scale))}' +
    '.card{background:var(--jp-bg);border:3px solid var(--jp-ink);box-shadow:inset 0 0 0 2px var(--jp-border),8px 8px 0 var(--jp-ink);padding:28px 30px;width:min(420px,100%);display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;box-sizing:border-box}' +
    '.lock{width:72px;height:72px;color:var(--jp-accent);filter:drop-shadow(3px 3px 0 var(--jp-ink))}' +
    '.school{font-size:.85em;letter-spacing:.14em;text-transform:uppercase;color:var(--jp-muted);font-weight:700}' +
    '.title{font-family:var(--jp-head);font-weight:700;font-size:1.7em;letter-spacing:.04em;text-transform:uppercase;color:var(--jp-accent);text-shadow:2px 2px 0 var(--jp-ink);line-height:1.1;text-wrap:balance}' +
    '.hint{font-size:.95em;color:var(--jp-text)}' +
    '.dots{display:flex;gap:14px;margin:4px 0}.dots i{width:18px;height:18px;border-radius:50%;border:2px solid var(--jp-accent);display:block}.dots i.on{background:var(--jp-accent)}' +
    '.pad{display:grid;grid-template-columns:repeat(3,76px);gap:8px}' +
    '.pad button{min-height:56px;font-family:var(--jp-head);font-weight:700;font-size:1.5em;background:var(--jp-panel);color:var(--jp-text);border:2px solid var(--jp-border);border-radius:8px;cursor:pointer}' +
    '.pad button:hover{background:var(--jp-panel-hover)}.pad button.go{background:var(--jp-accent);color:var(--jp-bg);border-color:var(--jp-accent)}.pad button.go:hover{background:var(--jp-accent-hover)}.pad button.alt{font-size:1em;font-family:var(--jp-font)}' +
    'input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}' +
    '.err{color:#ff8a8a;font-weight:700;min-height:1.3em}' +
    '.cancel{background:transparent;color:var(--jp-text);border:2px solid var(--jp-border);border-radius:6px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;min-height:44px}.cancel:hover{background:var(--jp-panel-hover)}';
  var ICON = '<svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.5" fill="currentColor"/></svg>';

  var LockScreen = function () { return Reflect.construct(HTMLElement, [], LockScreen); };
  LockScreen.prototype = Object.create(HTMLElement.prototype);
  LockScreen.prototype.constructor = LockScreen;
  LockScreen.prototype.connectedCallback = function () {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' }); this.pin = ''; this.err = '';
    var self = this;
    this.shadowRoot.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-k]') : null; if (!b) return;
      var k = b.getAttribute('data-k');
      if (k === 'cancel') { window.dispatchEvent(new CustomEvent('jp-lock-cancel')); return; }
      self.press(k); self.focusInput();
    });
    this.shadowRoot.addEventListener('keydown', function (e) {
      if (/^\d$/.test(e.key)) { e.preventDefault(); self.press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); self.press('del'); }
      else if (e.key === 'Enter') { e.preventDefault(); self.press('go'); }
      else if (e.key === 'Escape' && self.hasAttribute('cancelable')) window.dispatchEvent(new CustomEvent('jp-lock-cancel'));
    });
    this._tick = 0;
    this.render(); this.focusInput();
  };
  LockScreen.prototype.disconnectedCallback = function () { clearInterval(this._tick); };
  LockScreen.prototype.focusInput = function () { var i = this.shadowRoot.querySelector('input'); if (i) try { i.focus({ preventScroll: true }); } catch (e) {} };
  LockScreen.prototype.press = function (k) {
    if (this.busy) return;
    if (k === 'del') this.pin = this.pin.slice(0, -1);
    else if (k === 'go') { if (this.pin.length === 4) this.submit(); }
    else if (/^\d$/.test(k) && this.pin.length < 4) { this.pin += k; this.err = ''; if (this.pin.length === 4) { this.submit(); return; } }
    this.render();
  };
  LockScreen.prototype.submit = function () {
    var self = this, pin = this.pin; this.pin = ''; this.busy = true; this.render();
    unlock(pin).then(function (r) { self.busy = false; self.err = r && r.ok ? '' : ((r && r.message) || 'Wrong PIN'); self.render(); emit(); });
  };
  LockScreen.prototype.render = function () {
    var title = this.getAttribute('title') || '', cd = cooldown();
    var h = '<style>' + CSS + '</style><div class="wrap" role="dialog" aria-label="Sign in"><div class="card">' + ICON;
    h += '<div class="school">' + SCHOOL + '</div>';
    if (title) h += '<div class="title">' + title.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</div>';
    h += '<div class="hint">' + (cd > 0 ? 'Too many tries. Try again in ' + Math.ceil(cd / 1000) + 's.' : 'Teachers and substitutes: enter your 4-digit PIN') + '</div>';
    h += '<div class="dots">' + [0, 1, 2, 3].map(function (i) { return '<i class="' + (i < this.pin.length ? 'on' : '') + '"></i>'; }, this).join('') + '</div>';
    h += '<input type="password" inputmode="numeric" aria-label="PIN" autocomplete="off">';
    h += '<div class="pad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (d) { return '<button data-k="' + d + '">' + d + '</button>'; }).join('') + '<button class="alt" data-k="del">&larr;</button><button data-k="0">0</button><button class="go" data-k="go">&#10003;</button></div>';
    h += '<div class="err">' + this.err + '</div>';
    if (this.hasAttribute('cancelable')) h += '<button class="cancel" data-k="cancel">Cancel</button>';
    h += '</div></div>';
    this.shadowRoot.innerHTML = h;
  };
  if (!customElements.get('jp-lock-screen')) customElements.define('jp-lock-screen', LockScreen);

  var Badge = function () { return Reflect.construct(HTMLElement, [], Badge); };
  Badge.prototype = Object.create(HTMLElement.prototype);
  Badge.prototype.constructor = Badge;
  Badge.prototype.connectedCallback = function () { if (this.shadowRoot) return; this.attachShadow({ mode: 'open' }); var self = this; this._t = setInterval(function () { self.render(); }, 1000); this.render(); };
  Badge.prototype.disconnectedCallback = function () { clearInterval(this._t); };
  Badge.prototype.render = function () {
    var r = remaining(), show = isUnlocked() && r > 0 && r < WARN_MS;
    var mm = Math.floor(r / 60000), ss = Math.floor((r % 60000) / 1000);
    this.shadowRoot.innerHTML = '<style>:host{display:' + (show ? 'inline-flex' : 'none') + '}.b{background:var(--jp-accent2);color:var(--jp-bg);border-radius:6px;padding:6px 10px;font-family:var(--jp-font);font-weight:700;font-size:calc(14px * var(--jp-scale));white-space:nowrap}</style>' + (show ? '<div class="b" title="Signing out soon">Signs out in ' + mm + ':' + (ss < 10 ? '0' : '') + ss + '</div>' : '');
  };
  if (!customElements.get('jp-lock-badge')) customElements.define('jp-lock-badge', Badge);

  window.JPLock = { isUnlocked: isUnlocked, unlock: unlock, lock: lock, touch: function () {}, setPin: setPin, remaining: remaining, cooldown: cooldown, SCHOOL: SCHOOL };
})();
