// Shared weekly calendar for Home and every course page (data + the calendar view itself).
// Events come from your Google Calendar through the Worker (CALENDAR-SETUP.md, WORKER-CHANGE.md).
//
// How a Google Calendar title is read
//   A title can start with any mix, in any order and any capitalization, of course tags
//   (G7 G8 ALG1 GEO ALG2 ALG3) and the words "NS " and "HL ". Examples: "NS HL Christmas Break",
//   "GEO NS Class Party", "GEO ALG1 Test Unit 3". These words are removed from everything shown.
//
//   No course tag (school-wide), all-day:
//     NS          -> whole day striped; outlined header badge (party popper if HL too, otherwise calendar-X)
//     HL          -> outlined header badge with a party popper
//     anything else -> outlined header badge with a calendar icon
//   No course tag, timed:
//     Shown as plain text (title, time range, description) in each course cell whose class time
//     overlaps it (bell-schedule.js; Geometry includes both homerooms). HL adds a party popper;
//     NS stripes those cells. If it overlaps no class, it becomes a header badge with its time range.
//     Header badges never show descriptions; those appear only in the popup.
//   With course tag(s) (applies to every tagged course):
//     NS or HL (all-day or timed) -> that course's cell striped; title (and time) as plain text
//     otherwise -> chip: filled for quiz/test/exam, outlined for anything else; time and
//                  description go inside the chip
//   In a cell, each event's title, time and description stay together. Order: chips, NS/HL text,
//   timed school-wide events. A description already shown in that cell isn't repeated.
//
//   Text over 33 characters or with more than two line breaks is cut with "…" and a More link.
//   Hover (mouse, about 0.3 s) or tap (touch) any calendar item for its details. Phones show one day at a time.
(function () {
  if (window.HubCalendar) return;

  var COURSES = [
    { id: 'geo', name: 'Geometry', icon: 'architecture', fill: 'oklch(0.67 0.19 300)', radius: '50%', href: 'courses/geometry/' },
    { id: 'alg1', name: 'Algebra I', icon: 'calculate', fill: 'oklch(0.76 0.16 55)', radius: '24px', href: 'courses/algebra-i/' },
    { id: 'alg3', name: 'Algebra III', icon: 'ssid_chart', fill: 'oklch(0.88 0.16 95)', radius: '50%', href: 'courses/algebra-iii/' },
    { id: 'g7', name: '7th Grade Math', icon: 'square_foot', fill: 'oklch(0.74 0.17 150)', radius: '24px', href: 'courses/grade-7/' },
    { id: 'g8', name: '8th Grade Math', icon: 'straighten', fill: 'oklch(0.69 0.15 250)', radius: '50%', href: 'courses/grade-8/' },
    { id: 'alg2', name: 'Algebra II', icon: 'show_chart', fill: 'oklch(0.67 0.2 25)', radius: '24px', href: 'courses/algebra-ii/' }
  ];
  var BY_ID = {};
  COURSES.forEach(function (c) { BY_ID[c.id] = c; });
  var FOLD_CHARS = 33, FOLD_BREAKS = 2, OPEN_MS = 300, CLOSE_MS = 500;
  var STRIPES = 'repeating-linear-gradient(45deg,var(--surface2) 0 8px,transparent 8px 16px)';
  var EVENTS = []; // filled from Google Calendar

  // ---------- dates ----------
  function today() { var t = api && api._today ? api._today() : new Date(); t = new Date(t); t.setHours(0, 0, 0, 0); return t; }
  // On Saturday and Sunday, "this week" is the coming Monday to Friday.
  function monday(offset) {
    var t = today(), day = t.getDay(), m = new Date(t);
    if (day === 6) m.setDate(t.getDate() + 2);
    else if (day === 0) m.setDate(t.getDate() + 1);
    else m.setDate(t.getDate() - (day - 1));
    m.setDate(m.getDate() + offset * 7);
    return m;
  }
  function fmt(d, o) { return d.toLocaleDateString('en-US', o); }
  function clock(d) { var h = d.getHours(), m = d.getMinutes(); return { text: ((h + 11) % 12 + 1) + ':' + ('0' + m).slice(-2), ampm: h < 12 ? 'AM' : 'PM' }; }
  function timeRange(s, e) {
    if (!s) return '';
    var a = clock(s);
    if (!e || e <= s) return a.text + a.ampm;
    var b = clock(e);
    return a.ampm === b.ampm ? a.text + '–' + b.text + b.ampm : a.text + a.ampm + '–' + b.text + b.ampm;
  }
  function toDate(v) { if (!v) return null; var d = new Date(v); return isNaN(d) ? null : d; }

  // ---------- titles ----------
  var TAG_RE = /^(g7|g8|alg1|geo|alg2|alg3)\b[\s:\u2013\u2014-]*/i;
  var FLAG_RE = /^(ns|hl)\s+/i;
  function parseTitle(raw) {
    var s = String(raw || '').trim(), cs = [], ns = false, hl = false, m;
    for (;;) {
      if ((m = s.match(TAG_RE))) { var c = m[1].toLowerCase(); if (cs.indexOf(c) < 0) cs.push(c); }
      else if ((m = s.match(FLAG_RE))) { if (m[1].toLowerCase() === 'ns') ns = true; else hl = true; }
      else break;
      s = s.slice(m[0].length);
    }
    s = s.trim();
    return { cs: cs, ns: ns, hl: hl, title: s || String(raw || '').trim() };
  }

  // ---------- descriptions: plain text with clickable links ----------
  var ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  function decode(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, c) {
      if (c[0] === '#') {
        var n = c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
        return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
      }
      var v = ENT[c.toLowerCase()]; return v != null ? v : m;
    });
  }
  function safeHref(u) { u = String(u || '').trim(); return /^(https?:\/\/|mailto:)/i.test(u) ? u : ''; }
  var URL_RE = /(https?:\/\/[^\s<>"]+|mailto:[^\s<>"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
  function pushText(out, t) { if (!t) return; var last = out[out.length - 1]; if (last && !last.href) last.text += t; else out.push({ text: t }); }
  function linkify(out, text) {
    var last = 0, m; URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      var u = m[0], trail = (u.match(/[.,;:!?)\]'"]+$/) || [''])[0];
      if (trail) u = u.slice(0, -trail.length);
      if (!u) continue;
      pushText(out, text.slice(last, m.index));
      var href = /^(https?:|mailto:)/i.test(u) ? u : 'mailto:' + u;
      out.push({ text: u, href: href });
      last = m.index + u.length;
    }
    pushText(out, text.slice(last));
  }
  var TOKEN_RE = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>|<br\s*\/?>|<\/(?:p|div|li|h[1-6]|ul|ol|tr)\s*>|<li\b[^>]*>|<[^>]*>/gi;
  function descOf(raw) {
    var s = String(raw || '').replace(/\r\n?/g, '\n');
    if (!s.trim()) return null;
    var segs = [];
    if (/<\/?[a-z][^>]*>/i.test(s)) {
      var last = 0, m; TOKEN_RE.lastIndex = 0;
      var text = function (t) { linkify(segs, decode(t).replace(/[ \t\u00a0]+/g, ' ')); };
      while ((m = TOKEN_RE.exec(s))) {
        text(s.slice(last, m.index));
        var tok = m[0];
        if (m[1] != null) {
          var hm = m[1].match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
          var href = safeHref(decode(hm ? (hm[1] || hm[2] || hm[3] || '') : ''));
          var label = decode(m[2].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
          if (href) segs.push({ text: label || href.replace(/^mailto:/i, ''), href: href });
          else text(label);
        } else if (/^<br/i.test(tok) || /^<\//.test(tok)) pushText(segs, '\n');
        else if (/^<li/i.test(tok)) pushText(segs, '• ');
        last = m.index + tok.length;
      }
      text(s.slice(last));
    } else linkify(segs, s);
    // tidy whitespace: trim line ends, at most one blank line, nothing at the ends
    segs.forEach(function (g) { if (!g.href) g.text = g.text.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n'); });
    while (segs.length && !segs[0].href && !segs[0].text.trim()) segs.shift();
    while (segs.length && !segs[segs.length - 1].href && !segs[segs.length - 1].text.trim()) segs.pop();
    if (!segs.length) return null;
    if (!segs[0].href) segs[0].text = segs[0].text.replace(/^\s+/, '');
    var z = segs[segs.length - 1]; if (!z.href) z.text = z.text.replace(/\s+$/, '');
    var plain = segs.map(function (g) { return g.text; }).join('');
    return { segs: segs, text: plain, key: plain.toLowerCase().replace(/\s+/g, ' ').trim() };
  }
  // Where folded text is cut: after 33 characters or at the third line break, whichever comes first.
  function cutAt(text) {
    var c = Math.min(text.length, FOLD_CHARS), n = 0;
    for (var i = 0; i < c; i++) if (text[i] === '\n' && ++n > FOLD_BREAKS) return i;
    return c;
  }
  function needsFold(text) { return cutAt(text) < text.length; }
  function cutSegs(segs, c) {
    var out = [], used = 0;
    for (var i = 0; i < segs.length && used < c; i++) {
      var g = segs[i], t = g.text.slice(0, c - used);
      used += t.length; out.push(g.href ? { text: t, href: g.href } : { text: t });
    }
    var last = out[out.length - 1];
    if (last && !last.href) last.text = last.text.replace(/\s+$/, '');
    out.push({ text: '…' });
    return out;
  }
  // Street addresses link to Google Maps; "Gym" or "Room 12" stay plain text.
  var STREET_RE = /\b\d{1,6}\s+(?:[A-Za-z0-9.'-]+\s+){0,4}(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Hwy|Highway|Ln|Lane|Pkwy|Parkway|Way|Ct|Court|Cir|Circle|Pl|Place)\b/i;
  function mapHref(loc) { return loc && (STREET_RE.test(loc) || /\b\d{5}(?:-\d{4})?\b/.test(loc)) ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc) : ''; }

  // ---------- events from the Worker ----------
  var QUIZ_RE = /\b(quiz|test|exam)\b/i;
  function fromGoogle(list) {
    var m0 = monday(0), out = [];
    (list || []).forEach(function (e, i) {
      var start = toDate(e.start), end = toDate(e.end);
      var allDay = e.allDay !== false || !start; // older Worker: no allDay field -> treat as all-day
      var p = String(e.date || '').split('-').map(Number), dt;
      if (p.length === 3 && p.every(function (n) { return n > 0; })) dt = new Date(p[0], p[1] - 1, p[2]);
      else if (start) { dt = new Date(start); dt.setHours(0, 0, 0, 0); }
      else return;
      var diff = Math.round((dt - m0) / 86400000), w = Math.floor(diff / 7), d = diff - w * 7;
      if (w < 0 || w > 1 || d > 4) return;
      var t = parseTitle(e.title);
      out.push({
        id: 'e' + i, w: w, d: d, cs: t.cs, ns: t.ns, hl: t.hl, title: t.title, quiz: QUIZ_RE.test(t.title),
        allDay: allDay, start: allDay ? null : start, end: allDay ? null : end,
        loc: String(e.location || '').replace(/\s+/g, ' ').trim(), desc: descOf(e.description)
      });
    });
    return out;
  }

  // ---------- one week of view data ----------
  function mins(t) { var p = String(t).split(':'); return +p[0] * 60 + +p[1]; }
  function overlapCourses(ev) {
    var periods = (window.HubBell && window.HubBell.periods) || [];
    var s = ev.start.getHours() * 60 + ev.start.getMinutes();
    var e = ev.end ? (ev.end.toDateString() === ev.start.toDateString() ? ev.end.getHours() * 60 + ev.end.getMinutes() : 24 * 60) : s + 1;
    if (e <= s) e = s + 1;
    var hit = [];
    periods.forEach(function (p) {
      if (!p.c || !p.end || !BY_ID[p.c]) return;
      if (s < mins(p.end) && e > mins(p.start) && hit.indexOf(p.c) < 0) hit.push(p.c);
    });
    return hit;
  }
  function byStart(a, b) { return (a.start ? a.start.getTime() : 0) - (b.start ? b.start.getTime() : 0); }
  function week(offset) {
    var m = monday(offset), t = today(), days = [];
    for (var d = 0; d < 5; d++) {
      var dt = new Date(m); dt.setDate(m.getDate() + d);
      var day = {
        name: fmt(dt, { weekday: 'long' }), date: fmt(dt, { month: 'short', day: 'numeric' }),
        long: fmt(dt, { weekday: 'long', month: 'short', day: 'numeric' }), key: offset + '-' + d,
        isToday: dt.getTime() === t.getTime(), off: false, offLabel: '', badges: [], cells: {},
        events: [], items: [] // events/items: older fields some pages still read
      };
      COURSES.forEach(function (c) { day.cells[c.id] = { off: false, chips: [], plain: [], timed: [] }; });
      var evs = EVENTS.filter(function (e) { return e.w === offset && e.d === d; });
      evs.forEach(function (ev) {
        if (ev.cs.length) {
          var striped = ev.ns || ev.hl;
          ev.cs.forEach(function (c) {
            var cell = day.cells[c];
            if (striped) { cell.off = true; cell.plain.push({ ev: ev }); }
            else { cell.chips.push({ ev: ev }); day.items.push({ c: c, t: ev.quiz ? 'test' : 'due', title: ev.title }); }
          });
        } else if (ev.allDay) {
          if (ev.ns) { day.off = true; if (!day.offLabel) day.offLabel = ev.title; } else day.events.push(ev.title);
          day.badges.push({ ev: ev, icon: ev.hl ? 'celebration' : ev.ns ? 'event_busy' : 'event', rank: ev.ns ? 0 : ev.hl ? 1 : 2 });
        } else {
          var hit = overlapCourses(ev);
          if (hit.length) hit.forEach(function (c) { day.cells[c].timed.push({ ev: ev }); if (ev.ns) day.cells[c].off = true; });
          else day.badges.push({ ev: ev, icon: ev.hl ? 'celebration' : 'event', rank: 3, timed: true });
        }
      });
      day.badges.sort(function (a, b) { return a.rank - b.rank || byStart(a.ev, b.ev); });
      COURSES.forEach(function (c) {
        var cell = day.cells[c.id], seen = {};
        cell.timed.sort(function (a, b) { return byStart(a.ev, b.ev); });
        cell.chips.concat(cell.plain, cell.timed).forEach(function (x) {
          x.showDesc = !!(x.ev.desc && !seen[x.ev.desc.key]);
          if (x.ev.desc) seen[x.ev.desc.key] = 1;
        });
      });
      days.push(day);
    }
    var f = new Date(m), l = new Date(m); l.setDate(m.getDate() + 4);
    var range = f.getMonth() === l.getMonth()
      ? fmt(f, { month: 'short', day: 'numeric' }) + ' – ' + l.getDate()
      : fmt(f, { month: 'short', day: 'numeric' }) + ' – ' + fmt(l, { month: 'short', day: 'numeric' });
    return { label: (offset === 0 ? 'This week' : 'Next week') + ' · ' + range, days: days };
  }

  // ---------- the calendar view (React, rendered by Home and the course pages) ----------
  var CSS = [
    '.hcal-btn{transition:transform var(--dur) ease,box-shadow var(--dur) ease;}',
    '.hcal-btn:not(:disabled):hover{transform:translateY(var(--lift)) scale(var(--grow));box-shadow:var(--glow);}',
    '.hcal-btn:not(:disabled):active{box-shadow:var(--glow);}',
    '.hcal-btn:disabled{opacity:0.45;cursor:default;}',
    '.hcal-row{transition:box-shadow var(--dur) ease;}',
    '.hcal-row:hover{--row-t:translateY(var(--lift)) scale(calc(1 + (var(--grow) - 1) * 2.5));box-shadow:var(--row-glow);}',
    '.hcal-row:active{box-shadow:var(--row-glow);}',
    '.hcal-link{color:inherit;text-decoration:underline;text-underline-offset:2px;}',
    '.hcal-cut{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;}',
    '.hcal-more{display:inline;background:none;border:0;padding:0 0 0 4px;margin:0;color:inherit;font:inherit;font-size:13px;font-weight:700;text-decoration:underline;text-underline-offset:2px;cursor:pointer;white-space:nowrap;}'
  ].join('');
  function addCss() {
    if (document.getElementById('hcal-css')) return;
    var s = document.createElement('style'); s.id = 'hcal-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  // The site's animation speed (--dur): about 150 ms, or 0 when "Reduce motion" is on.
  function fadeMs() {
    var v = (getComputedStyle(document.documentElement).getPropertyValue('--dur') || '').trim();
    var n = parseFloat(v); if (isNaN(n)) return 150;
    return /ms$/.test(v) ? n : n * 1000;
  }
  var NARROW = '(max-width: 699px)';
  var View = null;
  function makeView() {
    var R = window.React, RD = window.ReactDOM, h = R.createElement;
    var useState = R.useState, useEffect = R.useEffect, useRef = R.useRef;
    var WRAP = { overflowWrap: 'anywhere', minWidth: 0 };
    function icon(name, size, extra) { return h('span', { className: 'material-symbols-rounded', 'aria-hidden': 'true', style: Object.assign({ fontSize: size + 'px', flex: 'none' }, extra || {}) }, name); }
    // inCell: links stay on one line and end in "…" at the cell's edge
    function segNodes(segs, inCell) {
      return segs.map(function (g, i) {
        return g.href ? h('a', { key: i, href: g.href, target: '_blank', rel: 'noopener noreferrer', className: inCell ? 'hcal-link hcal-cut' : 'hcal-link', 'data-hcal-nopop': '1' }, g.text) : g.text;
      });
    }

    return function HubCalendarView(props) {
      var home = props.mode !== 'course';
      var rows = home ? COURSES : COURSES.filter(function (c) { return c.id === props.course; });
      var tk = useState(0), setTick = tk[1];
      var mq = window.matchMedia ? window.matchMedia(NARROW) : null;
      var nr = useState(!!(mq && mq.matches)), narrow = nr[0], setNarrow = nr[1];
      var wk = useState(0), weekNo = wk[0], setWeek = wk[1];
      var dy = useState(null), dayPick = dy[0], setDay = dy[1];
      var pp = useState(null), pop = pp[0], setPop = pp[1];
      var fo = useState({}), open = fo[0], setOpen = fo[1];
      var T = useRef({ open: null, close: null, fade: null }), ptr = useRef('mouse'), hover = useRef(null), popRef = useRef(null);
      popRef.current = pop;

      function clearT(k) { clearTimeout(T.current[k]); T.current[k] = null; }
      function show(ev, day, key, node) {
        clearT('open'); clearT('close'); clearT('fade');
        var r = node.getBoundingClientRect(), rect = { top: r.top, bottom: r.bottom, left: r.left };
        var wasShown = popRef.current && popRef.current.vis;
        setPop({ key: key, ev: ev, day: day, rect: rect, vis: !!wasShown });
        if (!wasShown) requestAnimationFrame(function () { requestAnimationFrame(function () {
          setPop(function (p) { return p && p.key === key ? Object.assign({}, p, { vis: true }) : p; });
        }); });
      }
      function hide() {
        clearT('open'); clearT('close');
        if (!popRef.current) return;
        var ms = fadeMs();
        if (!ms) { setPop(null); return; }
        setPop(function (p) { return p ? Object.assign({}, p, { vis: false }) : p; });
        clearT('fade');
        T.current.fade = setTimeout(function () { setPop(function (p) { return p && !p.vis ? null : p; }); }, ms + 30);
      }
      function later() { clearT('close'); T.current.close = setTimeout(hide, CLOSE_MS); }
      function drop() { clearT('open'); clearT('close'); clearT('fade'); hover.current = null; setPop(null); }

      useEffect(function () {
        addCss();
        var bump = function () { setTick(function (x) { return x + 1; }); };
        var onMq = function () { setNarrow(!!mq.matches); drop(); };
        var down = function (e) {
          ptr.current = e.pointerType || 'mouse';
          var t = e.target;
          if (!(t && t.closest && t.closest('[data-hcal-pop],[data-hcal-trig]'))) hide();
        };
        window.addEventListener('hubcal-ready', bump);
        window.addEventListener('hubbell-ready', bump);
        window.addEventListener('scroll', hide);
        window.addEventListener('resize', hide);
        document.addEventListener('pointerdown', down, true);
        if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq); }
        var daily = setInterval(bump, 60000);
        return function () {
          window.removeEventListener('hubcal-ready', bump);
          window.removeEventListener('hubbell-ready', bump);
          window.removeEventListener('scroll', hide);
          window.removeEventListener('resize', hide);
          document.removeEventListener('pointerdown', down, true);
          if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else mq.removeListener(onMq); }
          clearInterval(daily); clearT('open'); clearT('close'); clearT('fade');
        };
      }, []);

      var weeks = [week(0), week(1)];
      var todayIdx = weeks[0].days.findIndex(function (d) { return d.isToday; });
      var dayIdx = dayPick == null ? Math.max(0, todayIdx) : dayPick;

      // ----- popup triggers: mouse waits ~0.3 s; touch opens on tap. More/Less never opens one.
      function onMore(t) { return !!(t && t.closest && t.closest('[data-hcal-more]')); }
      function trig(ev, day, key, style) {
        var enter = function (node) {
          if (hover.current === key) return;
          hover.current = key;
          if (popRef.current && popRef.current.key === key) { clearT('close'); return; }
          clearT('open');
          T.current.open = setTimeout(function () { if (hover.current === key) show(ev, day, key, node); }, OPEN_MS);
        };
        var leave = function () {
          if (hover.current === key) hover.current = null;
          clearT('open');
          if (popRef.current) later();
        };
        return {
          key: key, 'data-hcal-trig': '1', style: style,
          onPointerMove: function (e) { if (e.pointerType !== 'mouse') return; if (onMore(e.target)) leave(); else enter(e.currentTarget); },
          onPointerLeave: function (e) { if (e.pointerType === 'mouse') leave(); },
          onClick: function (e) {
            if (ptr.current === 'mouse') return;
            if (e.target.closest && e.target.closest('[data-hcal-nopop],[data-hcal-more]')) return;
            if (pop && pop.key === key && pop.vis) hide(); else show(ev, day, key, e.currentTarget);
          }
        };
      }
      // ----- folded text: first 33 characters (or 3 lines), then "…" and More
      function folded(segs, text, key, style, inCell) {
        var cut = cutAt(text), long = cut < text.length, isOpen = !!open[key];
        var shown = long && !isOpen ? cutSegs(segs, cut) : segs;
        return h('span', { style: Object.assign({ display: 'block', whiteSpace: 'pre-line' }, WRAP, style || {}) },
          segNodes(shown, inCell),
          long ? h('button', {
            type: 'button', className: 'hcal-more', 'data-hcal-more': '1', 'aria-expanded': isOpen ? 'true' : 'false',
            onClick: function (e) { e.stopPropagation(); setOpen(function (o) { var n = Object.assign({}, o); n[key] = !o[key]; return n; }); }
          }, isOpen ? 'Less' : 'More') : null);
      }
      function title(ev, key, style) { return folded([{ text: ev.title }], ev.title, key + ':t', style, true); }
      function desc(ev, key, style) { return ev.desc ? folded(ev.desc.segs, ev.desc.text, key + ':d', style, true) : null; }
      function time(ev, style) { return ev.allDay ? null : h('span', { style: Object.assign({ fontSize: '13px', fontWeight: 600 }, style || {}) }, timeRange(ev.start, ev.end)); }

      // ----- pieces
      function badge(b, day) {
        var ev = b.ev, key = day.key + ':b:' + ev.id;
        return h('div', trig(ev, day, key, Object.assign({ alignSelf: 'flex-start', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '14px', fontWeight: 700, lineHeight: 1.35, padding: '3px 10px', borderRadius: '8px', background: 'transparent', border: '1.5px solid var(--ink)', color: 'var(--ink)' }, WRAP)),
          icon(b.icon, 16, { marginTop: '1px' }),
          h('div', { style: Object.assign({ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }, WRAP) },
            title(ev, key),
            b.timed ? time(ev) : null));
      }
      function dayHead(day, i, wide) {
        return h('div', { key: day.key, role: wide ? 'columnheader' : undefined, style: { padding: '12px 14px', borderBottom: '1px solid var(--line)', borderLeft: wide && (home || i > 0) ? '1px solid var(--line)' : '0', background: day.off ? STRIPES : day.isToday ? 'var(--surface2)' : 'transparent', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 } },
          h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            h('span', { style: { fontSize: '18px', fontWeight: 700 } }, day.name),
            day.isToday ? h('span', { style: { fontSize: '13px', fontWeight: 700, padding: '2px 10px', borderRadius: '999px', background: 'var(--ink)', color: 'var(--bg)' } }, 'Today') : null),
          h('span', { style: { fontSize: '15px', color: 'var(--muted)' } }, day.date),
          day.badges.map(function (b) { return badge(b, day); }));
      }
      // Each event's title, time and description stay together.
      function cellBody(day, c) {
        var cell = day.cells[c.id], k = day.key + ':' + c.id + ':', out = [];
        cell.chips.forEach(function (x) {
          var ev = x.ev, key = k + 'c:' + ev.id, test = ev.quiz;
          var multi = !ev.allDay || x.showDesc || needsFold(ev.title) || ev.title.length > 22;
          out.push(h('div', trig(ev, day, key, Object.assign({ alignSelf: multi ? 'stretch' : 'flex-start', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 10px', borderRadius: multi ? '14px' : '999px', border: '2px solid ' + c.fill, background: test ? c.fill : 'transparent', color: test ? '#15151a' : 'var(--ink)', fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }, WRAP)),
            title(ev, key), time(ev), x.showDesc ? desc(ev, key, { fontSize: '13px', fontWeight: 400 }) : null));
        });
        cell.plain.forEach(function (x) {
          var ev = x.ev, key = k + 'p:' + ev.id;
          out.push(h('div', trig(ev, day, key, Object.assign({ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.35 }, WRAP)),
            title(ev, key, { fontSize: '14px', fontWeight: 700 }),
            time(ev, { color: 'var(--muted)' }),
            x.showDesc ? desc(ev, key, { fontSize: '14px', color: 'var(--muted)' }) : null));
        });
        cell.timed.forEach(function (x) {
          var ev = x.ev, key = k + 's:' + ev.id;
          out.push(h('div', trig(ev, day, key, Object.assign({ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.35 }, WRAP)),
            h('div', { style: Object.assign({ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '14px', fontWeight: 700 }, WRAP) },
              ev.hl ? icon('celebration', 16, { marginTop: '1px' }) : null,
              h('div', { style: Object.assign({ display: 'flex', flexDirection: 'column', flex: 1 }, WRAP) }, title(ev, key))),
            time(ev, { color: 'var(--muted)' }),
            x.showDesc ? desc(ev, key, { fontSize: '14px', color: 'var(--muted)' }) : null));
        });
        return out;
      }
      function cellBg(day, c) { return day.off || day.cells[c.id].off ? STRIPES : day.isToday ? 'var(--surface2)' : 'transparent'; }
      function rowHead(c, wide, top) {
        return h('a', { key: 'rh-' + c.id, href: c.href, role: wide ? 'rowheader' : undefined, className: 'hcal-row', style: { '--row-glow': 'var(--ci-' + c.id + ')', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '10px 12px', borderTop: top ? '1px solid var(--line)' : '0', color: 'var(--ink)', textDecoration: 'none', fontSize: '16px', fontWeight: 700, lineHeight: 1.25, minWidth: 0 } },
          h('span', { style: Object.assign({ display: 'flex', alignItems: 'center', gap: '10px', transform: 'var(--row-t,none)', transformOrigin: 'left center', transition: 'transform var(--dur) ease' }, WRAP) },
            h('span', { className: 'material-symbols-rounded', 'aria-hidden': 'true', style: { flex: 'none', width: '34px', height: '34px', borderRadius: c.radius, background: c.fill, color: '#15151a', display: 'grid', placeItems: 'center', fontSize: '20px' } }, c.icon),
            h('span', { style: WRAP }, c.name)));
      }
      function cell(day, c, i, wide, top) {
        return h('div', { key: day.key + c.id, role: wide ? 'cell' : undefined, style: { padding: '10px', borderTop: top ? '1px solid var(--line)' : '0', borderLeft: wide ? (home || i > 0 ? '1px solid var(--line)' : '0') : (home ? '1px solid var(--line)' : '0'), background: cellBg(day, c), display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '56px', minWidth: 0, boxSizing: 'border-box' } }, cellBody(day, c));
      }
      function emptyWeek(wkObj) {
        return wkObj.days.every(function (d) {
          return !d.off && !d.badges.length && rows.every(function (c) { var x = d.cells[c.id]; return !x.off && !x.chips.length && !x.plain.length && !x.timed.length; });
        });
      }
      var legend = h('div', { style: { flex: 1, display: 'flex', gap: '8px 22px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: 'var(--muted)' } },
        h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('span', { 'aria-hidden': 'true', style: { width: '34px', height: '20px', borderRadius: '999px', background: 'var(--ink)' } }), 'Filled: Assessment'),
        h('span', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('span', { 'aria-hidden': 'true', style: { width: '34px', height: '20px', borderRadius: '999px', border: '2px solid var(--ink)', boxSizing: 'border-box' } }), 'Outlined: Due Date'));
      var BTN = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '48px', padding: '0 18px', borderRadius: '12px', border: '2px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '16px', fontWeight: 700, cursor: 'pointer' };
      var box = { border: '1px solid var(--line)', borderRadius: '24px', background: 'var(--surface)', overflow: 'hidden' };
      var body;

      if (!narrow) {
        var wkObj = weeks[weekNo];
        body = [
          h('div', { key: 'top', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
            h('h2', { id: 'cal-title', style: { margin: 0, fontSize: '28px' } }, wkObj.label),
            legend,
            h('button', { type: 'button', className: 'hcal-btn', style: BTN, onClick: function () { drop(); setWeek(weekNo ? 0 : 1); } }, weekNo === 0 ? 'Next week →' : '← This week')),
          h('div', { key: 'grid', style: box },
            h('div', { role: 'table', 'aria-label': wkObj.label, style: { display: 'grid', gridTemplateColumns: home ? 'minmax(0,0.9fr) repeat(5,minmax(0,1fr))' : 'repeat(5,minmax(0,1fr))' } },
              h('div', { role: 'row', style: { display: 'contents' } },
                home ? h('div', { role: 'columnheader', style: { background: 'var(--surface)', padding: '14px 12px', borderBottom: '1px solid var(--line)', fontSize: '15px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'flex-end' } }, 'Class') : null,
                wkObj.days.map(function (d, i) { return dayHead(d, i, true); })),
              rows.map(function (c) {
                return h('div', { key: c.id, role: 'row', style: { display: 'contents' } },
                  home ? rowHead(c, true, true) : null,
                  wkObj.days.map(function (d, i) { return cell(d, c, i, true, home); }));
              }))),
          emptyWeek(wkObj) ? h('p', { key: 'empty', style: { margin: 0, fontSize: '17px', color: 'var(--muted)' } }, weekNo ? 'No events next week.' : 'No events this week.') : null
        ];
      } else {
        var wn = dayIdx >= 5 ? 1 : 0, day = weeks[wn].days[dayIdx % 5];
        var NAV = Object.assign({}, BTN, { flex: '1 1 0', minWidth: 0, padding: '0 8px', fontSize: 'clamp(12px, 4vw, 16px)', whiteSpace: 'nowrap' });
        var go = function (n) { drop(); setDay(Math.max(0, Math.min(9, dayIdx + n))); };
        body = [
          h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
            h('h2', { id: 'cal-title', style: { margin: 0, fontSize: '26px' } }, weeks[wn].label),
            legend),
          h('div', { key: 'day', role: 'group', 'aria-label': day.long, style: box },
            dayHead(day, 0, false),
            home
              ? rows.map(function (c, r) {
                  return h('div', { key: c.id, style: { display: 'grid', gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.5fr)', borderTop: r ? '1px solid var(--line)' : '0' } }, rowHead(c, false, false), cell(day, c, 0, false, false));
                })
              : cell(day, rows[0], 0, false, false)),
          h('div', { key: 'nav', style: { display: 'flex', gap: '10px', width: '100%' } },
            h('button', { type: 'button', className: 'hcal-btn', style: NAV, disabled: dayIdx <= 0, onClick: function () { go(-1); } }, 'Previous Day'),
            h('button', { type: 'button', className: 'hcal-btn', style: NAV, disabled: dayIdx >= 9, onClick: function () { go(1); } }, 'Next Day'))
        ];
      }

      // ----- popup (fades in and out with the site's animation speed)
      var popEl = null;
      if (pop) {
        var ev = pop.ev, vw = window.innerWidth, vh = window.innerHeight;
        var w = Math.min(340, vw - 24), left = Math.max(12, Math.min(pop.rect.left, vw - w - 12));
        var below = vh - pop.rect.bottom - 20, above = pop.rect.top - 20;
        var place = below >= 220 || below >= above
          ? { top: pop.rect.bottom + 8 + 'px', maxHeight: Math.max(120, below) + 'px' }
          : { bottom: vh - pop.rect.top + 8 + 'px', maxHeight: Math.max(120, above) + 'px' };
        var line = function (ic, content) { return h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '14px', color: 'var(--muted)' } }, icon(ic, 18), h('span', { style: WRAP }, content)); };
        var map = mapHref(ev.loc);
        popEl = h('div', {
          'data-hcal-pop': '1', role: 'dialog', 'aria-label': ev.title,
          onPointerEnter: function (e) { if (e.pointerType === 'mouse') clearT('close'); },
          onPointerLeave: function (e) { if (e.pointerType === 'mouse') later(); },
          style: Object.assign({ position: 'fixed', left: left + 'px', width: w + 'px', boxSizing: 'border-box', zIndex: 300, overflowY: 'auto', background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 12px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font)', lineHeight: 1.4, textAlign: 'left', opacity: pop.vis ? 1 : 0, transition: 'opacity var(--dur) ease', pointerEvents: pop.vis ? 'auto' : 'none' }, place)
        },
          ev.cs.length ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 12px' } }, ev.cs.map(function (id) {
            var c = BY_ID[id];
            return h('span', { key: id, style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 } }, h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '50%', background: c.fill, flex: 'none' } }), c.name);
          })) : null,
          h('div', { style: Object.assign({ fontSize: '17px', fontWeight: 700, lineHeight: 1.3 }, WRAP) }, ev.title),
          ev.allDay ? null : line('schedule', timeRange(ev.start, ev.end)),
          ev.loc ? line('location_on', map ? h('a', { href: map, target: '_blank', rel: 'noopener noreferrer', className: 'hcal-link' }, ev.loc) : ev.loc) : null,
          ev.desc ? h('div', { style: Object.assign({ fontSize: '14px', whiteSpace: 'pre-line' }, WRAP) }, segNodes(ev.desc.segs, false)) : null);
        popEl = RD && RD.createPortal ? RD.createPortal(popEl, document.body) : popEl;
      }
      return h(R.Fragment, null, body, popEl);
    };
  }
  function element(props) {
    var R = window.React;
    if (!R || !R.useState) return null;
    if (!View) View = makeView();
    return R.createElement(View, props || {});
  }

  function loadLive() {
    var base = window.HubState && window.HubState.apiBase;
    if (!base || !window.fetch) return;
    fetch(base + '/api/calendar', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.ok || !Array.isArray(d.events)) return;
      EVENTS.length = 0; Array.prototype.push.apply(EVENTS, fromGoogle(d.events));
      api.live = true;
      window.dispatchEvent(new Event('hubcal-ready'));
    }).catch(function () {});
  }
  var api = window.HubCalendar = {
    events: EVENTS, week: week, element: element, courses: COURSES, live: false,
    _test: { parseTitle: parseTitle, descOf: descOf, needsFold: needsFold, cutAt: cutAt, cutSegs: cutSegs, mapHref: mapHref, fromGoogle: fromGoogle, timeRange: timeRange }
  };
  window.dispatchEvent(new Event('hubcal-ready'));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLive); else setTimeout(loadLive, 0);
})();
