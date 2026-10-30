(function () {
  if (window.JPTheme) return;
  var KEY = 'jp.theme.v1';
  var PRESETS = {
    classic: { label: 'Classic blue & gold', bg: '#060a4a', panel: '#0a1cc7', panelHover: '#1a2ee0', border: '#3a4ae0', accent: '#ffcc33', accentHover: '#ffd966', text: '#ffffff', muted: '#c5caff', ink: '#000000', headBg: '#0a1cc7', accent2: '#ffcc33' },
    dark: { label: 'Dark', bg: '#0b0b0f', panel: '#17171f', panelHover: '#23232f', border: '#3c3c4e', accent: '#e8c35a', accentHover: '#f2d37c', text: '#f4f4f4', muted: '#bdbdcc', ink: '#000000', headBg: '#1f1f2c', accent2: '#e8c35a' },
    light: { label: 'Light paper', bg: '#f4efe3', panel: '#fffdf7', panelHover: '#efe8d4', border: '#c9c0a6', accent: '#1b2a6b', accentHover: '#2f3f8a', text: '#1c1f3a', muted: '#555a7a', ink: '#c9c0a6', headBg: '#1b2a6b', accent2: '#8a5a00' },
    purple: { label: 'Purple & teal', bg: '#1a0f2e', panel: '#2b1a4a', panelHover: '#3a2563', border: '#5b3f8a', accent: '#2dd4bf', accentHover: '#5eead4', text: '#f3eefc', muted: '#cbb8ec', ink: '#0d0718', headBg: '#3b1d6b', accent2: '#f5c542' },
    contrast: { label: 'High contrast', bg: '#000000', panel: '#000000', panelHover: '#262600', border: '#ffff00', accent: '#ffff00', accentHover: '#ffff80', text: '#ffffff', muted: '#ffffff', ink: '#000000', headBg: '#000000', accent2: '#ffff00' }
  };
  var FONTS = {
    atkinson: { label: 'Atkinson Hyperlegible', body: "'Atkinson Hyperlegible',system-ui,sans-serif", head: "Oswald,'Atkinson Hyperlegible',sans-serif" },
    opendyslexic: { label: 'OpenDyslexic', body: "'OpenDyslexic','Open-Dyslexic',Verdana,sans-serif", head: "'OpenDyslexic','Open-Dyslexic',Verdana,sans-serif" },
    lexend: { label: 'Lexend', body: "Lexend,system-ui,sans-serif", head: "Lexend,system-ui,sans-serif" },
    verdana: { label: 'Verdana', body: "Verdana,Geneva,sans-serif", head: "Verdana,Geneva,sans-serif" }
  };
  var SIZES = [{ id: 'normal', label: 'Normal', scale: 1 }, { id: 'large', label: 'Large', scale: 1.15 }, { id: 'xlarge', label: 'X-Large', scale: 1.3 }, { id: 'huge', label: 'Huge', scale: 1.5 }];
  var TIMERS = [{ id: 'default', label: 'Game default', secs: null }, { id: '60', label: '60s', secs: 60 }, { id: '90', label: '90s', secs: 90 }, { id: '120', label: '120s', secs: 120 }, { id: 'off', label: 'Off', secs: 0 }];
  var DDS = [{ id: '0', label: 'None' }, { id: '1', label: '1' }, { id: '2', label: '2' }];
  var DEFAULTS = { preset: 'classic', font: 'atkinson', size: 'normal', mute: false, timer: 'default', dd: '2' };

  function get() {
    var s = null;
    try { s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
    var o = Object.assign({}, DEFAULTS, s || {});
    if (!PRESETS[o.preset]) o.preset = 'classic';
    if (!FONTS[o.font]) o.font = 'atkinson';
    return o;
  }
  function set(patch) {
    var o = Object.assign(get(), patch);
    try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    apply();
    window.dispatchEvent(new CustomEvent('jp-theme-change', { detail: o }));
    return o;
  }
  function ddCount() { var n = parseInt(get().dd, 10); return isNaN(n) ? 2 : Math.max(0, Math.min(2, n)); }
  function timerSecs() { var t = get().timer; var f = TIMERS.filter(function (x) { return x.id === t; })[0]; return f ? f.secs : null; }
  var fontsLoaded = false;
  function loadFonts() {
    if (fontsLoaded || !document.head) return; fontsLoaded = true;
    ['https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Atkinson+Hyperlegible:wght@400;700&family=Lexend:wght@400;500;700&display=swap', 'https://fonts.cdnfonts.com/css/opendyslexic'].forEach(function (href) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
    });
  }
  function apply() {
    var o = get(), p = PRESETS[o.preset], f = FONTS[o.font], st = document.documentElement.style;
    var sz = SIZES.filter(function (x) { return x.id === o.size; })[0] || SIZES[0];
    st.setProperty('--jp-bg', p.bg); st.setProperty('--jp-panel', p.panel); st.setProperty('--jp-panel-hover', p.panelHover);
    st.setProperty('--jp-border', p.border); st.setProperty('--jp-accent', p.accent); st.setProperty('--jp-accent-hover', p.accentHover);
    st.setProperty('--jp-text', p.text); st.setProperty('--jp-muted', p.muted); st.setProperty('--jp-ink', p.ink);
    st.setProperty('--jp-head-bg', p.headBg); st.setProperty('--jp-accent2', p.accent2);
    st.setProperty('--jp-font', f.body); st.setProperty('--jp-head', f.head); st.setProperty('--jp-scale', String(sz.scale));
    loadFonts();
  }
  apply();
  document.addEventListener('DOMContentLoaded', loadFonts);

  var CSS = '' +
    ':host{display:inline-block;font-family:var(--jp-font);font-size:calc(15px * var(--jp-scale))}' +
    '.gear{background:var(--jp-panel);color:var(--jp-text);border:2px solid var(--jp-border);border-radius:6px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1.2}' +
    '.gear:hover{background:var(--jp-panel-hover)}' +
    '.back{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900}' +
    '.panel{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:var(--jp-bg);color:var(--jp-text);border-left:3px solid var(--jp-border);z-index:901;overflow:auto;padding:20px 22px 28px;display:flex;flex-direction:column;gap:18px;box-sizing:border-box}' +
    'h2{margin:0;font-family:var(--jp-head);font-size:1.6em;letter-spacing:.04em;text-transform:uppercase;color:var(--jp-accent)}' +
    'h3{margin:0 0 8px;font-size:.85em;letter-spacing:.1em;text-transform:uppercase;color:var(--jp-muted)}' +
    '.row{display:flex;flex-wrap:wrap;gap:8px}' +
    '.opt{background:var(--jp-panel);color:var(--jp-text);border:2px solid var(--jp-border);border-radius:6px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;gap:8px}' +
    '.opt:hover{background:var(--jp-panel-hover)}' +
    '.opt[aria-pressed=true]{border-color:var(--jp-accent);box-shadow:inset 0 0 0 2px var(--jp-accent)}' +
    '.sw{display:inline-flex;border:1px solid rgba(255,255,255,.3);border-radius:3px;overflow:hidden}.sw i{width:12px;height:20px;display:block}' +
    '.close{margin-left:auto;background:transparent;color:var(--jp-text);border:2px solid var(--jp-border);border-radius:6px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer}' +
    '.close:hover{background:var(--jp-panel-hover)}' +
    '.prev{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:var(--jp-bg);padding:8px;border:2px solid var(--jp-border);border-radius:6px}' +
    '.prev .c{background:var(--jp-head-bg);border:2px solid var(--jp-ink);box-shadow:inset 0 0 0 1px var(--jp-border);color:var(--jp-text);font-family:var(--jp-head);font-weight:700;text-transform:uppercase;font-size:.7em;text-align:center;padding:8px 4px;letter-spacing:.04em}' +
    '.prev .t{background:var(--jp-panel);border:2px solid var(--jp-ink);box-shadow:inset 0 0 0 1px var(--jp-border);color:var(--jp-accent);font-family:var(--jp-head);font-weight:700;font-size:1.4em;text-align:center;padding:10px 4px;text-shadow:2px 2px 0 var(--jp-ink)}' +
    '.prev .q{grid-column:1/-1;background:var(--jp-panel);border:2px solid var(--jp-ink);padding:10px 12px;font-size:.95em;line-height:1.4}.prev .q b{color:var(--jp-accent)}' +
    '.pin{background:var(--jp-panel);color:var(--jp-text);border:2px solid var(--jp-border);border-radius:6px;padding:8px 10px;font:inherit;width:120px;min-height:44px;letter-spacing:.2em}.msg{margin-top:6px;font-size:.9em;color:var(--jp-accent);min-height:1.2em}' +
    '.reset{align-self:flex-start;background:transparent;color:var(--jp-accent);border:2px solid var(--jp-accent);border-radius:6px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}.reset:hover{background:var(--jp-accent);color:var(--jp-bg)}';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var JPSettings = function () { return Reflect.construct(HTMLElement, [], JPSettings); };
  JPSettings.prototype = Object.create(HTMLElement.prototype);
  JPSettings.prototype.constructor = JPSettings;
  JPSettings.prototype.connectedCallback = function () {
    if (this.shadowRoot) return;
    this.open = false;
    this.attachShadow({ mode: 'open' });
    var self = this;
    this.shadowRoot.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b) return;
      var act = b.getAttribute('data-act'), v = b.getAttribute('data-v');
      if (act === 'open') self.open = true;
      else if (act === 'close') self.open = false;
      else if (act === 'pinchange') { var o1 = self.shadowRoot.querySelector('[data-pin=old]'), n1 = self.shadowRoot.querySelector('[data-pin=new]'); var err = window.JPLock ? JPLock.setPin(o1 && o1.value, n1 && n1.value) : 'Lock not loaded.'; self.pinMsg = err || 'PIN changed.'; self.render(); return; }
      else if (act === 'reset') set(DEFAULTS);
      else if (act === 'mute') set({ mute: v === '1' });
      else { var patch = {}; patch[act] = v; set(patch); }
      self.render();
    });
    this._onKey = function (e) { if (e.key === 'Escape' && self.open) { self.open = false; self.render(); } };
    document.addEventListener('keydown', this._onKey);
    this.render();
  };
  JPSettings.prototype.disconnectedCallback = function () { document.removeEventListener('keydown', this._onKey); };
  JPSettings.prototype.render = function () {
    var o = get(), h = '<style>' + CSS + '</style>';
    h += '<button class="gear" data-act="open" title="Display settings" aria-label="Display settings">&#9881; Settings</button>';
    if (this.open) {
      h += '<div class="back" data-act="close"></div><div class="panel" role="dialog" aria-label="Display settings">';
      h += '<div style="display:flex;align-items:center;gap:12px"><h2>Settings</h2><button class="close" data-act="close">Done</button></div>';
      h += '<div class="prev"><div class="c">Category</div><div class="c">Category</div><div class="c">Category</div><div class="t">$200</div><div class="t">$400</div><div class="t">$600</div><div class="q">Solve 3x + 5 = 20. <b>x = 5</b></div></div>';
      h += '<div><h3>Color scheme</h3><div class="row">';
      Object.keys(PRESETS).forEach(function (k) { var p = PRESETS[k]; h += '<button class="opt" data-act="preset" data-v="' + k + '" aria-pressed="' + (o.preset === k) + '"><span class="sw"><i style="background:' + p.bg + '"></i><i style="background:' + p.panel + '"></i><i style="background:' + p.accent + '"></i></span>' + esc(p.label) + '</button>'; });
      h += '</div></div><div><h3>Font</h3><div class="row">';
      Object.keys(FONTS).forEach(function (k) { h += '<button class="opt" data-act="font" data-v="' + k + '" aria-pressed="' + (o.font === k) + '" style="font-family:' + esc(FONTS[k].body) + '">' + esc(FONTS[k].label) + '</button>'; });
      h += '</div></div><div><h3>Text size</h3><div class="row">';
      SIZES.forEach(function (s) { h += '<button class="opt" data-act="size" data-v="' + s.id + '" aria-pressed="' + (o.size === s.id) + '">' + s.label + '</button>'; });
      h += '</div></div><div><h3>Sounds</h3><div class="row"><button class="opt" data-act="mute" data-v="0" aria-pressed="' + !o.mute + '">On</button><button class="opt" data-act="mute" data-v="1" aria-pressed="' + !!o.mute + '">Muted by default</button></div></div>';
      h += '<div><h3>Timer per question</h3><div class="row">';
      TIMERS.forEach(function (t) { h += '<button class="opt" data-act="timer" data-v="' + t.id + '" aria-pressed="' + (o.timer === t.id) + '">' + t.label + '</button>'; });
      h += '</div></div><div><h3>Daily Doubles per game</h3><div class="row">';
      DDS.forEach(function (d) { h += '<button class="opt" data-act="dd" data-v="' + d.id + '" aria-pressed="' + (String(o.dd) === d.id) + '">' + d.label + '</button>'; });
      h += '</div></div><button class="reset" data-act="reset">Reset to defaults</button>';
      h += '<div style="font-size:.85em;color:var(--jp-muted)">Settings apply to the dashboard and every game. They clear when this tab closes.</div></div>';
    }
    this.shadowRoot.innerHTML = h;
  };
  if (!customElements.get('jp-settings')) customElements.define('jp-settings', JPSettings);

  window.JPTheme = { get: get, set: set, apply: apply, timerSecs: timerSecs, ddCount: ddCount, PRESETS: PRESETS, FONTS: FONTS, SIZES: SIZES, TIMERS: TIMERS, DEFAULTS: DEFAULTS };
})();
