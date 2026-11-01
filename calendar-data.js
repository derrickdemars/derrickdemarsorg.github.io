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
//   Titles show on one line (two for Classroom due dates) and descriptions on at most two; longer text ends in "…".
//   Items with a Classroom post link show a small ↗ after the title. Clicking the item (mouse) or pressing Enter
//   opens the post in a new tab; the popup has a "View post" link. Over the ↗ (and ~6 px around it) no popup opens.
//   Hover (mouse, about 0.3 s) or tap (touch) any calendar item for its full details. Phones show one day at a time.
//
// Subscribe
//   The "Subscribe to calendar" button below the calendar opens the subscribe form (calendar app, courses,
//   school-wide). The live feed comes from the Worker at /api/calendar.ics. Feed timing (the site's display
//   is unchanged): timed events keep their times (a due time alone becomes 15 minutes from it); all-day
//   school-wide and NS/HL events stay all-day; other all-day course items use bell-schedule.js:
//   quiz/test/exam = the class period, anything else = 15 minutes from class start, one event per course.
//
// Loading
//   Until Google Calendar events and Classroom due dates have both arrived, the grid dims and a circular
//   loader appears (after 0.3 s, so fast loads never show it), in the course's color on course pages.
//   If Google Calendar fails or takes over 20 s: "Couldn't load events." with Try again.
//   If only Classroom due dates fail or take over 20 s: events show, with a note and Try again.
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
  var OPEN_MS = 300, CLOSE_MS = 500, SPIN_DELAY_MS = 300, LOAD_TIMEOUT_MS = 20000;
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
        loc: String(e.location || '').replace(/\s+/g, ' ').trim(), desc: descOf(e.description),
        link: e.gc && /^https?:\/\//i.test(String(e.link || '').trim()) ? String(e.link).trim() : ''
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
    '.hcal-clamp{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;}',
    '.hcal-spin{width:40px;height:40px;box-sizing:border-box;border-radius:50%;border:4px solid var(--line);border-top-color:var(--spin);animation:hcal-rot 0.9s linear infinite;}',
    '.hcal-spin.hcal-calm{border-color:var(--spin);animation:hcal-pulse 1.6s ease-in-out infinite;}',
    '@keyframes hcal-rot{to{transform:rotate(360deg);}}',
    '@keyframes hcal-pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}',
    '.hcal-go{flex:none;display:inline-flex;align-items:center;justify-content:center;padding:6px;margin:-5px -6px -6px -3px;position:relative;z-index:1;cursor:pointer;transition:transform var(--dur) ease;}',
    '.hcal-go:hover{transform:translateY(var(--lift));}',
    '.hcal-lift{transition:transform var(--dur) ease,box-shadow var(--dur) ease;}',
    '.hcal-lift:hover{transform:translateY(var(--lift)) scale(var(--grow));box-shadow:var(--glow);}',
    '[data-hcal-trig][role=link]:focus-visible{outline:3px solid var(--ink);outline-offset:2px;}',
    '.hcal-check{display:flex;align-items:center;gap:10px;min-height:40px;font-size:16px;cursor:pointer;}',
    '.hcal-check input{width:20px;height:20px;margin:0;accent-color:var(--ink);flex:none;}',
    '.hcal-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}'
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
      var md = useState(false), modal = md[0], setModal = md[1]; // subscribe window open?
      var fm = useState(null), form = fm[0], setForm = fm[1];     // subscribe form: { app, courses: {id: bool}, sw }
      var opener = useRef(null), panelRef = useRef(null);
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

      // ----- Subscribe window
      function openModal() {
        opener.current = document.activeElement;
        startForm();
        setModal(true);
      }
      function closeModal() {
        setModal(false);
        var o = opener.current; opener.current = null;
        if (o && o.focus && document.contains(o)) setTimeout(function () { o.focus(); }, 0);
      }
      function startForm() {
        var on = {};
        COURSES.forEach(function (c) { on[c.id] = home ? true : c.id === props.course; });
        setForm({ app: 'google', courses: on, sw: true });
      }

      useEffect(function () {
        if (!modal) return;
        var panel = panelRef.current;
        var first = panel && panel.querySelector('[data-hcal-first]') || (panel && panel.querySelector('button,input,a[href]'));
        if (first) first.focus();
        var prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
        var key = function (e) {
          if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
          if (e.key !== 'Tab' || !panelRef.current) return;
          var f = Array.prototype.filter.call(panelRef.current.querySelectorAll('button,input,a[href]'), function (n) { return !n.disabled; });
          if (!f.length) return;
          var a = f[0], z = f[f.length - 1];
          if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
          else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
          else if (!panelRef.current.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        };
        document.addEventListener('keydown', key, true);
        return function () { document.removeEventListener('keydown', key, true); document.body.style.overflow = prev; };
      }, [modal]);

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
        window.addEventListener('hubcal-status', bump);
        window.addEventListener('hubclassroom-ready', bump);
        window.addEventListener('hubbell-ready', bump);
        window.addEventListener('scroll', hide);
        window.addEventListener('resize', hide);
        document.addEventListener('pointerdown', down, true);
        if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq); }
        var daily = setInterval(bump, 60000);
        return function () {
          window.removeEventListener('hubcal-ready', bump);
          window.removeEventListener('hubcal-status', bump);
          window.removeEventListener('hubclassroom-ready', bump);
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

      // ----- popup triggers: mouse waits ~0.3 s; touch opens on tap.
      function onGo(t) { return !!(t && t.closest && t.closest('[data-hcal-go]')); }
      function openPost(url) { window.open(url, '_blank', 'noopener'); }
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
        var a = {
          key: key, 'data-hcal-trig': '1', style: style,
          onPointerMove: function (e) {
            if (e.pointerType !== 'mouse') return;
            // Over the ↗ (and ~6 px around it): no new popup; one already open for this item stays open.
            if (onGo(e.target)) {
              clearT('open');
              if (popRef.current && popRef.current.key === key) clearT('close');
              else if (hover.current === key) hover.current = null;
              return;
            }
            enter(e.currentTarget);
          },
          onPointerLeave: function (e) { if (e.pointerType === 'mouse') leave(); },
          onClick: function (e) {
            var inLink = e.target.closest && e.target.closest('[data-hcal-nopop]');
            if (ptr.current === 'mouse') { if (ev.link && !inLink) openPost(ev.link); return; }
            if (inLink) return;
            if (pop && pop.key === key && pop.vis) hide(); else show(ev, day, key, e.currentTarget);
          }
        };
        if (ev.link) {
          a.tabIndex = 0; a.role = 'link';
          a['aria-label'] = ev.title + ', View in Google Classroom, opens in new tab';
          a.onKeyDown = function (e) { if (e.key === 'Enter') { e.preventDefault(); openPost(ev.link); } };
        }
        return a;
      }
      // ----- clamped text: titles one line, descriptions two; the browser adds "…"; the popup shows it all
      function clamp(segs, lines, style) {
        return h('span', { className: 'hcal-clamp', style: Object.assign({ WebkitLineClamp: String(lines) }, WRAP, style || {}) }, segNodes(segs, true));
      }
      function title(ev, key, style) {
        var lines = ev.gc ? 2 : 1; // Classroom due dates get two lines; Google Calendar events one
        if (!ev.link) return clamp([{ text: ev.title }], lines, style);
        return h('span', { style: Object.assign({ display: 'flex', alignItems: 'flex-start', minWidth: 0 }, style || {}) },
          clamp([{ text: ev.title }], lines, { flex: '1 1 auto' }),
          h('span', { className: 'hcal-go', 'data-hcal-go': '1', title: 'View in Google Classroom', 'aria-hidden': 'true' }, icon('open_in_new', 14)));
      }
      function desc(ev, key, style) { return ev.desc ? clamp(ev.desc.segs, 2, style) : null; }
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
          var multi = !ev.allDay || x.showDesc || /\n/.test(ev.title) || ev.title.length > 22;
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

      // ----- loading: dim the grid with a loader, or a failure message with Try again
      var ph = phase(), spin = ph === 'loading' && Date.now() >= LOAD.spinAt, failed = ph === 'failed';
      var dim = spin || failed;
      var spinColor = home ? 'var(--ink)' : (BY_ID[props.course] ? BY_ID[props.course].fill : 'var(--ink)');
      function boxStyle() { return Object.assign({}, box, { position: 'relative' }); }
      function dimStyle() { return dim ? { opacity: 0.35, pointerEvents: 'none', userSelect: 'none' } : {}; }
      function veil() {
        if (!dim) return null;
        return h('div', { key: 'veil', style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '16px', zIndex: 2 } },
          failed
            ? h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '18px 22px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--line)', textAlign: 'center' } },
                h('span', { style: { fontSize: '18px', fontWeight: 700, color: 'var(--ink)' } }, 'Couldn’t load events.'),
                h('button', { type: 'button', className: 'hcal-btn', style: BTN, onClick: function () { retryAll(); } }, 'Try again'))
            : h('div', { className: 'hcal-spin' + (fadeMs() ? '' : ' hcal-calm'), 'aria-hidden': 'true', style: { '--spin': spinColor } }));
      }
      var live = h('span', { key: 'live', className: 'hcal-sr', role: 'status', 'aria-live': 'polite' },
        spin ? 'Loading events' : failed ? 'Couldn’t load events.' : ph === 'partial' ? 'Classroom due dates didn’t load.' : '');
      var note = ph === 'partial' ? h('div', { key: 'note', style: { display: 'flex', alignItems: 'center', gap: '8px 12px', flexWrap: 'wrap', fontSize: '15px', color: 'var(--muted)' } },
        h('span', null, 'Classroom due dates didn’t load.'),
        h('button', { type: 'button', className: 'hcal-btn', style: Object.assign({}, BTN, { minHeight: '36px', padding: '0 12px', fontSize: '14px' }), onClick: function () { retryClassroom(); } }, 'Try again')) : null;

      if (!narrow) {
        var wkObj = weeks[weekNo];
        body = [
          h('div', { key: 'top', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
            h('h2', { id: 'cal-title', style: { margin: 0, fontSize: '28px' } }, wkObj.label),
            legend,
            h('button', { type: 'button', className: 'hcal-btn', style: BTN, onClick: function () { drop(); setWeek(weekNo ? 0 : 1); } }, weekNo === 0 ? 'Next week →' : '← This week')),
          h('div', { key: 'grid', style: boxStyle(), 'aria-busy': ph === 'loading' ? 'true' : 'false' },
            h('div', { role: 'table', 'aria-label': wkObj.label, style: Object.assign({ display: 'grid', gridTemplateColumns: home ? 'minmax(0,0.9fr) repeat(5,minmax(0,1fr))' : 'repeat(5,minmax(0,1fr))' }, dimStyle()) },
              h('div', { role: 'row', style: { display: 'contents' } },
                home ? h('div', { role: 'columnheader', style: { background: 'var(--surface)', padding: '14px 12px', borderBottom: '1px solid var(--line)', fontSize: '15px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'flex-end' } }, 'Class') : null,
                wkObj.days.map(function (d, i) { return dayHead(d, i, true); })),
              rows.map(function (c) {
                return h('div', { key: c.id, role: 'row', style: { display: 'contents' } },
                  home ? rowHead(c, true, true) : null,
                  wkObj.days.map(function (d, i) { return cell(d, c, i, true, home); }));
              })),
            veil()),
          note,
          live,
          ph !== 'loading' && !failed && emptyWeek(wkObj) ? h('p', { key: 'empty', style: { margin: 0, fontSize: '17px', color: 'var(--muted)' } }, weekNo ? 'No events next week.' : 'No events this week.') : null
        ];
      } else {
        var wn = dayIdx >= 5 ? 1 : 0, day = weeks[wn].days[dayIdx % 5];
        var NAV = Object.assign({}, BTN, { flex: '1 1 0', minWidth: 0, padding: '0 8px', fontSize: 'clamp(12px, 4vw, 16px)', whiteSpace: 'nowrap' });
        var go = function (n) { drop(); setDay(Math.max(0, Math.min(9, dayIdx + n))); };
        body = [
          h('div', { key: 'top', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
            h('h2', { id: 'cal-title', style: { margin: 0, fontSize: '26px' } }, weeks[wn].label),
            legend),
          h('div', { key: 'day', role: 'group', 'aria-label': day.long, 'aria-busy': ph === 'loading' ? 'true' : 'false', style: boxStyle() },
            h('div', { style: dimStyle() },
              dayHead(day, 0, false),
              home
                ? rows.map(function (c, r) {
                    return h('div', { key: c.id, style: { display: 'grid', gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.5fr)', borderTop: r ? '1px solid var(--line)' : '0' } }, rowHead(c, false, false), cell(day, c, 0, false, false));
                  })
                : cell(day, rows[0], 0, false, false)),
            veil()),
          note,
          live,
          h('div', { key: 'nav', style: { display: 'flex', gap: '10px', width: '100%' } },
            h('button', { type: 'button', className: 'hcal-btn', style: NAV, disabled: dayIdx <= 0, onClick: function () { go(-1); } }, 'Previous Day'),
            h('button', { type: 'button', className: 'hcal-btn', style: NAV, disabled: dayIdx >= 9, onClick: function () { go(1); } }, 'Next Day'))
        ];
      }

      body.push(h('div', { key: 'sub', style: { display: 'flex' } },
        h('button', { type: 'button', className: 'hcal-btn', style: Object.assign({}, BTN, narrow ? { width: '100%' } : {}), onClick: openModal },
          icon('event_repeat', 20), 'Subscribe to calendar')));

      function renderModal() {
        var titleId = 'hcal-md-title';
        var top = h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
          h('span', { style: { flex: 1 } }),
          h('button', { type: 'button', 'aria-label': 'Close', className: 'hcal-btn', style: { width: '40px', height: '40px', display: 'grid', placeItems: 'center', borderRadius: '10px', border: '2px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer', padding: 0 }, onClick: closeModal }, icon('close', 20)));
        var heading = function (t) { return h('h2', { id: titleId, style: { margin: 0, fontSize: '24px', lineHeight: 1.25 } }, t); };
        var f = form || { app: 'google', courses: {}, sw: true };
        var chosen = COURSES.filter(function (c) { return f.courses[c.id]; }).map(function (c) { return c.id; });
        var can = chosen.length > 0 || f.sw;
        var set = function (patch) { setForm(Object.assign({}, f, patch)); };
        var radio = function (val, label, note) {
          return h('label', { className: 'hcal-check', style: { alignItems: 'flex-start' } },
            h('input', { type: 'radio', name: 'hcal-app', checked: f.app === val, 'data-hcal-first': f.app === val ? '1' : undefined, onChange: function () { set({ app: val }); }, style: { marginTop: '2px' } }),
            h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } }, h('span', { style: { fontWeight: 700 } }, label), note ? h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, note) : null));
        };
        var group = function (label, kids) {
          return h('fieldset', { style: { margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: '4px' } },
            h('legend', { style: { padding: 0, marginBottom: '6px', fontSize: '15px', fontWeight: 700, color: 'var(--muted)' } }, label), kids);
        };
        var parts = [heading('Subscribe to calendar'),
          group('Calendar app', [
            h(R.Fragment, { key: 'g' }, radio('google', 'Google Calendar', 'Google Calendar can take up to a day to show changes.')),
            h(R.Fragment, { key: 'o' }, radio('other', 'Apple, Outlook, other'))]),
          group('Courses', COURSES.map(function (c) {
            return h('label', { key: c.id, className: 'hcal-check' },
              h('input', { type: 'checkbox', checked: !!f.courses[c.id], 'data-hcal-course': c.id, onChange: function () { var n = Object.assign({}, f.courses); n[c.id] = !n[c.id]; set({ courses: n }); } }),
              h('span', { 'aria-hidden': 'true', style: { width: '14px', height: '14px', borderRadius: c.radius === '50%' ? '50%' : '4px', background: c.fill, flex: 'none' } }),
              c.name);
          })),
          h('label', { className: 'hcal-check' },
            h('input', { type: 'checkbox', checked: !!f.sw, 'data-hcal-sw': '1', onChange: function () { set({ sw: !f.sw }); } }),
            h('span', { style: { fontWeight: 700 } }, 'Include school-wide events')),
          h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '4px' } },
            h('button', { type: 'button', className: 'hcal-btn', style: BTN, onClick: closeModal }, 'Cancel'),
            h('button', { type: 'button', className: 'hcal-btn', 'data-hcal-subscribe': '1', disabled: !can, style: Object.assign({}, BTN, { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' }),
              onClick: function () { subscribe(f.app, chosen, f.sw); closeModal(); } }, icon('event_repeat', 20), 'Subscribe'))];
        var panel = h('div', { ref: panelRef, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, 'data-hcal-modal': '1',
          style: Object.assign({ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', fontFamily: 'var(--font)', lineHeight: 1.4, textAlign: 'left' },
            narrow ? { position: 'fixed', inset: 0, padding: 'calc(16px + env(safe-area-inset-top, 0px)) 18px calc(18px + env(safe-area-inset-bottom, 0px))', borderRadius: 0 }
                   : { width: 'min(460px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 48px)', padding: '18px 22px 22px', borderRadius: '20px', boxShadow: '0 20px 48px rgba(0,0,0,0.4)' }) },
          top, parts);
        return h('div', { 'data-hcal-backdrop': '1', onPointerDown: function (e) { if (e.target === e.currentTarget) closeModal(); },
          style: { position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center' } }, panel);
      }

      // ----- popup (fades in and out with the site's animation speed)
      var ACT = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 };
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
          ev.desc ? h('div', { style: Object.assign({ fontSize: '14px', whiteSpace: 'pre-line' }, WRAP) }, segNodes(ev.desc.segs, false)) : null,
          ev.link ? h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', margin: '0 -8px' } },
            h('a', { href: ev.link, target: '_blank', rel: 'noopener noreferrer', className: 'hcal-link hcal-lift', style: ACT }, 'View post', icon('open_in_new', 16))) : null);
        popEl = RD && RD.createPortal ? RD.createPortal(popEl, document.body) : popEl;
      }
      var modalEl = modal ? renderModal() : null;
      if (modalEl && RD && RD.createPortal) modalEl = RD.createPortal(modalEl, document.body);
      return h(R.Fragment, null, body, popEl, modalEl);
    };
  }
  function element(props) {
    var R = window.React;
    if (!R || !R.useState) return null;
    if (!View) View = makeView();
    return R.createElement(View, props || {});
  }

  // ---------- subscribe ----------
  function feedUrl(courses, sw) {
    var base = (window.HubState && window.HubState.apiBase) || '';
    return base.replace(/^https?:/, 'webcal:') + '/api/calendar.ics?c=' + courses.join(',') + '&sw=' + (sw ? 1 : 0);
  }
  function subscribe(app, courses, sw) {
    var webcal = feedUrl(courses, sw);
    if (app === 'google') window.open('https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal), '_blank', 'noopener');
    else window.location.href = webcal;
  }

  // ---------- loading status (Google Calendar here; Classroom due dates from classroom-feed.js) ----------
  // LOAD.cal: loading | ready | error. clDeadline: when a still-pending Classroom counts as failed.
  var LOAD = { cal: 'loading', seq: 0, spinAt: Date.now() + SPIN_DELAY_MS, clDeadline: Date.now() + LOAD_TIMEOUT_MS };
  function notify() { window.dispatchEvent(new Event('hubcal-status')); }
  function notifyIn(ms) { setTimeout(notify, ms + 30); }
  notifyIn(SPIN_DELAY_MS); notifyIn(LOAD_TIMEOUT_MS);
  function clState() {
    var C = window.HubClassroom;
    if (!C || !C.status) return 'none';
    var s = C.status();
    if (s === 'off') return 'none';
    if (s === 'ready' || s === 'error') return s;
    return Date.now() >= LOAD.clDeadline ? 'error' : 'pending'; // idle (about to load) or loading
  }
  // loading | failed (Calendar failed) | partial (events shown, Classroom due dates failed) | ready
  function phase() {
    if (LOAD.cal === 'error') return 'failed';
    var cl = clState();
    if (LOAD.cal !== 'ready' || cl === 'pending') return 'loading';
    return cl === 'error' ? 'partial' : 'ready';
  }
  function restartClassroom() {
    var C = window.HubClassroom;
    if (C && C.status && C.status() === 'error' && C.reload) C.reload(); // a still-pending request keeps going
    LOAD.clDeadline = Date.now() + LOAD_TIMEOUT_MS; notifyIn(LOAD_TIMEOUT_MS);
  }
  function retryAll() {
    if (clState() === 'error') restartClassroom();
    LOAD.spinAt = Date.now() + SPIN_DELAY_MS; notifyIn(SPIN_DELAY_MS);
    loadLive();
  }
  function retryClassroom() {
    LOAD.spinAt = Date.now() + SPIN_DELAY_MS; notifyIn(SPIN_DELAY_MS);
    restartClassroom(); notify();
  }

  function loadLive() {
    var base = window.HubState && window.HubState.apiBase;
    var my = ++LOAD.seq;
    function fail() { if (my !== LOAD.seq) return; LOAD.seq++; LOAD.cal = 'error'; notify(); }
    if (!base || !window.fetch) { fail(); return; }
    LOAD.cal = 'loading'; notify();
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); fail(); }, LOAD_TIMEOUT_MS);
    fetch(base + '/api/calendar', { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (my !== LOAD.seq) return;
      clearTimeout(timer);
      if (!d || !d.ok || !Array.isArray(d.events)) { fail(); return; }
      EVENTS.length = 0; Array.prototype.push.apply(EVENTS, fromGoogle(d.events));
      api.live = true; LOAD.cal = 'ready';
      window.dispatchEvent(new Event('hubcal-ready'));
      notify();
    }).catch(function () { clearTimeout(timer); fail(); });
  }
  var api = window.HubCalendar = {
    events: EVENTS, week: week, element: element, courses: COURSES, live: false,
    status: function () { return phase(); }, reload: retryAll,
    _test: { parseTitle: parseTitle, descOf: descOf, mapHref: mapHref, fromGoogle: fromGoogle, timeRange: timeRange, _load: LOAD,
      feedUrl: feedUrl }
  };
  window.dispatchEvent(new Event('hubcal-ready'));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLive); else setTimeout(loadLive, 0);
})();
