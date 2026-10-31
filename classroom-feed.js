// Google Classroom feed: shows each course's newest Classroom posts on its course page.
// Posts come from the Apps Script in CLASSROOM-SETUP.md. Until FEED_URL is filled in
// (or the Worker serves /api/classroom), the section stays hidden.
//
// What a student sees for each post: the kind (Announcement, Assignment, Question, Material),
// the topic, the posted date, the title, the text (folded with More/Less), the due date and
// points for assignments, attachment links, and an "Open in Classroom" link. Only posts to the
// whole class are sent; the script never sends student names, comments, grades, or rosters.
(function () {
  if (window.HubClassroom) return;

  // ---------- settings ----------
  var FEED_URL = 'https://script.google.com/macros/s/AKfycbxvifbW9xpwVqsykNnry1WknDgv7_riJLg8VGrV-DCjoUxzrZiRY16xFCyEYaQFaosW/exec';          // your Apps Script web app address (ends in /exec)
  var USE_WORKER = false;     // true if your Worker serves /api/classroom (see worker-classroom.js)
  var SHOW_AT_FIRST = 4;      // posts shown before "Show more"
  var TEACHER_ONLY = false;   // true hides the feed from everyone who isn't signed in as teacher
  var FOLD_CHARS = 240;       // longer text folds with a More button
  var FOLD_BREAKS = 3;        // ...or text with more line breaks than this
  var DEMO = false;           // true shows sample posts so you can preview the layout

  var COURSES = {
    geo: { name: 'Geometry', fill: 'oklch(0.67 0.19 300)', text: 'var(--t-geo)' },
    alg1: { name: 'Algebra I', fill: 'oklch(0.76 0.16 55)', text: 'var(--t-alg1)' },
    alg2: { name: 'Algebra II', fill: 'oklch(0.67 0.2 25)', text: 'var(--t-alg2)' },
    alg3: { name: 'Algebra III', fill: 'oklch(0.88 0.16 95)', text: 'var(--t-alg3)' },
    g7: { name: '7th Grade Math', fill: 'oklch(0.74 0.17 150)', text: 'var(--t-g7)' },
    g8: { name: '8th Grade Math', fill: 'oklch(0.69 0.15 250)', text: 'var(--t-g8)' }
  };
  var KINDS = {
    announcement: { label: 'Announcement', icon: 'campaign' },
    assignment: { label: 'Assignment', icon: 'assignment' },
    question: { label: 'Question', icon: 'help' },
    material: { label: 'Material', icon: 'menu_book' }
  };
  var FILE_ICON = { drive: 'description', youtube: 'smart_display', link: 'link', form: 'ballot' };

  var DATA = null;       // the feed, keyed by course id
  var STATUS = 'idle';   // idle | loading | ready | error | off

  // ---------- text: plain text with clickable links, folded ----------
  var URL_RE = /(https?:\/\/[^\s<>"]+|mailto:[^\s<>"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})/g;
  function segsOf(raw) {
    var cal = window.HubCalendar && window.HubCalendar._test;
    if (cal && cal.descOf) { var d = cal.descOf(raw); return d ? d.segs : []; }
    var text = String(raw || '').replace(/\r\n?/g, '\n').trim(), out = [], last = 0, m;
    if (!text) return out;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      var u = m[0], trail = (u.match(/[.,;:!?)\]'"]+$/) || [''])[0];
      if (trail) u = u.slice(0, -trail.length);
      if (m.index > last) out.push({ text: text.slice(last, m.index) });
      out.push({ text: u, href: /^(https?:|mailto:)/i.test(u) ? u : 'mailto:' + u });
      last = m.index + u.length;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out;
  }
  function plainOf(segs) { return segs.map(function (g) { return g.text; }).join(''); }
  function cutAt(text) {
    var cut = text.length, breaks = 0;
    for (var i = 0; i < text.length; i++) if (text[i] === '\n' && ++breaks > FOLD_BREAKS) { cut = i; break; }
    if (text.length > FOLD_CHARS) {
      var c = text.lastIndexOf(' ', FOLD_CHARS); if (c < FOLD_CHARS * 0.6) c = FOLD_CHARS;
      cut = Math.min(cut, c);
    }
    return cut;
  }
  function cutSegs(segs, cut) {
    var out = [], n = 0;
    for (var i = 0; i < segs.length && n < cut; i++) {
      var g = segs[i], take = Math.min(g.text.length, cut - n);
      if (take === g.text.length) out.push(g);
      else if (!g.href) out.push({ text: g.text.slice(0, take) });
      else out.push(g);
      n += g.text.length;
    }
    var z = out[out.length - 1];
    if (z && !z.href) z.text = z.text.replace(/\s+$/, '');
    return out;
  }

  // ---------- dates ----------
  function toDate(v) { if (!v) return null; var d = new Date(v); return isNaN(d) ? null : d; }
  function fmtDay(d, long) {
    var now = new Date(), o = { month: 'short', day: 'numeric' };
    if (long) o.weekday = 'short';
    if (d.getFullYear() !== now.getFullYear()) o.year = 'numeric';
    return d.toLocaleDateString(undefined, o);
  }
  function fmtTime(d) { return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function postedLabel(p) {
    var d = toDate(p.posted); if (!d) return '';
    var days = Math.floor((startOfDay(new Date()) - startOfDay(d)) / 864e5);
    if (days === 0) return 'Posted today';
    if (days === 1) return 'Posted yesterday';
    return 'Posted ' + fmtDay(d, false);
  }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function dueLabel(due) {
    if (!due) return null;
    var d = due.time ? toDate(due.time) : null;
    if (!d) { var parts = String(due.date || '').split('-'); if (parts.length !== 3) return null; d = new Date(+parts[0], +parts[1] - 1, +parts[2]); }
    var past = due.time ? d < new Date() : startOfDay(d) < startOfDay(new Date());
    var s = 'Due ' + fmtDay(d, true) + (due.time ? ' · ' + fmtTime(d) : '');
    return { text: s, past: past };
  }

  // ---------- styles ----------
  var CSS = [
    '.hgc-btn{transition:transform var(--dur) ease,box-shadow var(--dur) ease;}',
    '.hgc-btn:not(:disabled):hover{transform:translateY(var(--lift)) scale(var(--grow));box-shadow:var(--glow);}',
    '.hgc-btn:not(:disabled):active{box-shadow:var(--glow);}',
    '.hgc-link{color:inherit;text-decoration:underline;text-underline-offset:2px;}',
    '.hgc-more{display:inline;background:none;border:0;padding:0 0 0 4px;margin:0;color:inherit;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px;cursor:pointer;white-space:nowrap;}',
    '.hgc-card{transition:box-shadow var(--dur) ease;}'
  ].join('');
  function addCss() {
    if (document.getElementById('hgc-css')) return;
    var s = document.createElement('style'); s.id = 'hgc-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------- the view (React, rendered by the course pages) ----------
  var View = null;
  function makeView() {
    var R = window.React, h = R.createElement, useState = R.useState, useEffect = R.useEffect;
    var WRAP = { overflowWrap: 'anywhere', minWidth: 0 };
    function icon(name, size, extra) { return h('span', { className: 'material-symbols-rounded', 'aria-hidden': 'true', style: Object.assign({ fontSize: size + 'px', flex: 'none' }, extra || {}) }, name); }
    var LINK_BTN = { display: 'flex', alignItems: 'center', gap: '6px', minHeight: '46px', padding: '0 14px', borderRadius: '12px', border: '2px solid var(--line)', color: 'var(--ink)', textDecoration: 'none', fontSize: '16px', fontWeight: 700, background: 'var(--surface)' };

    return function ClassroomView(props) {
      var key = props.course, c = COURSES[key] || { name: 'Course', fill: 'var(--surface2)', text: 'var(--ink)' };
      var st = useState({}); var open = st[0], setOpen = st[1];
      var st2 = useState(false); var all = st2[0], setAll = st2[1];
      useEffect(function () { addCss(); }, []);

      var course = DATA && DATA[key];
      if (STATUS === 'off' || (STATUS === 'idle' && !course)) return null;

      var head = h('div', { key: 'head', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' } },
        h('h2', { id: 'gc-title', style: { margin: 0, fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px' } }, icon('school', 30, { color: c.text }), 'Google Classroom'),
        course && course.link ? h('a', { href: course.link, target: '_blank', rel: 'noopener', className: 'hgc-btn', style: LINK_BTN }, 'Open Classroom', icon('open_in_new', 20)) : null);

      function note(text) { return h('div', { key: 'note', style: { padding: '20px', border: '2px dashed var(--line)', borderRadius: '20px', fontSize: '18px', color: 'var(--muted)' } }, text); }

      var body;
      if (STATUS === 'loading' && !course) body = note('Loading Classroom posts…');
      else if (STATUS === 'error' && !course) body = note('Classroom posts aren’t available right now. Try again in a few minutes.');
      else if (!course) body = note('This course isn’t connected to Google Classroom yet.');
      else if (course.error) body = note('Classroom posts aren’t available right now.');
      else if (!course.posts.length) body = note('No posts yet.');
      else {
        var posts = course.posts, shown = all ? posts : posts.slice(0, SHOW_AT_FIRST);
        body = [
          h('ul', { key: 'list', style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' } }, shown.map(function (p) { return card(p); })),
          posts.length > SHOW_AT_FIRST ? h('button', {
            key: 'more', type: 'button', className: 'hgc-btn', 'aria-expanded': all ? 'true' : 'false',
            style: Object.assign({}, LINK_BTN, { alignSelf: 'flex-start', cursor: 'pointer', justifyContent: 'center' }),
            onClick: function () { setAll(!all); }
          }, icon(all ? 'expand_less' : 'expand_more', 20), all ? 'Show fewer' : 'Show ' + (posts.length - SHOW_AT_FIRST) + ' more') : null
        ];
      }

      function folded(raw, id) {
        var segs = segsOf(raw); if (!segs.length) return null;
        var text = plainOf(segs), cut = cutAt(text), long = cut < text.length, isOpen = !!open[id];
        var use = long && !isOpen ? cutSegs(segs, cut) : segs;
        return h('p', { style: Object.assign({ margin: 0, fontSize: '17px', whiteSpace: 'pre-line', lineHeight: 'var(--lh)' }, WRAP) },
          use.map(function (g, i) { return g.href ? h('a', { key: i, href: g.href, target: '_blank', rel: 'noopener noreferrer', className: 'hgc-link' }, g.text) : g.text; }),
          long && !isOpen ? '…' : null,
          long ? h('button', { type: 'button', className: 'hgc-more', 'aria-expanded': isOpen ? 'true' : 'false', onClick: function () { setOpen(function (o) { var n = Object.assign({}, o); n[id] = !o[id]; return n; }); } }, isOpen ? 'Less' : 'More') : null);
      }

      function card(p) {
        var k = KINDS[p.kind] || KINDS.announcement, due = dueLabel(p.due);
        var meta = [k.label];
        if (p.topic) meta.push(p.topic);
        var when = postedLabel(p); if (when) meta.push(when);
        return h('li', { key: p.id, className: 'hgc-card', style: { background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '6px solid ' + c.fill, borderRadius: '20px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', minWidth: 0 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '15px', fontWeight: 700, color: 'var(--muted)' } },
            icon(k.icon, 20, { color: c.text }),
            meta.map(function (t, i) { return h('span', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px' } }, i ? h('span', { 'aria-hidden': 'true' }, '·') : null, t); })),
          p.title ? h('h3', { style: Object.assign({ margin: 0, fontSize: '20px', lineHeight: 1.25 }, WRAP) }, p.title) : null,
          folded(p.text, p.id),
          due || p.points != null ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px 18px', flexWrap: 'wrap', fontSize: '16px', fontWeight: 700 } },
            due ? h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px', color: due.past ? 'var(--muted)' : 'var(--ink)' } }, icon('event', 20), due.text + (due.past ? ' (past)' : '')) : null,
            p.points != null ? h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)' } }, icon('star', 20), p.points + (p.points === 1 ? ' point' : ' points')) : null) : null,
          p.files && p.files.length ? h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, p.files.map(function (f, i) {
            var ic = icon(FILE_ICON[f.type] || 'attach_file', 20), label = h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40ch' } }, f.title);
            var style = { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '4px 14px', borderRadius: '14px', background: 'var(--surface2)', color: 'var(--ink)', textDecoration: 'none', fontSize: '15px', fontWeight: 700, maxWidth: '100%', boxSizing: 'border-box' };
            return f.url ? h('a', { key: i, href: f.url, target: '_blank', rel: 'noopener', className: 'hgc-btn', style: style }, ic, label) : h('span', { key: i, style: style }, ic, label);
          })) : null,
          p.link ? h('a', { href: p.link, target: '_blank', rel: 'noopener', className: 'hgc-link', style: { alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '40px', fontSize: '15px', fontWeight: 700, color: 'var(--muted)' } }, 'Open in Classroom', icon('open_in_new', 18)) : null);
      }

      return h(R.Fragment, null, head, body);
    };
  }
  function element(props) {
    var R = window.React;
    if (!R || !R.useState) return null;
    if (!View) View = makeView();
    return R.createElement(View, props || {});
  }
  function visible() { return !TEACHER_ONLY || !!(window.HubState && window.HubState.get && window.HubState.get().teacher); }

  // ---------- loading ----------
  function feedUrl() {
    if (FEED_URL) return FEED_URL;
    var base = window.HubState && window.HubState.apiBase;
    if (USE_WORKER && base) return base + '/api/classroom';
    return '';
  }
  function announce() { window.dispatchEvent(new Event('hubclassroom-ready')); }
  function load() {
    if (DEMO) { DATA = demo(); STATUS = 'ready'; announce(); return; }
    var url = feedUrl();
    if (!url || !window.fetch) { STATUS = 'off'; announce(); return; }
    STATUS = 'loading'; announce();
    fetch(url, { cache: 'no-store', redirect: 'follow' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.ok || !d.courses) throw new Error('bad feed');
      DATA = {};
      for (var k in d.courses) { var c = d.courses[k]; DATA[k] = c.error ? { error: c.error } : { name: c.name || '', link: c.link || '', posts: Array.isArray(c.posts) ? c.posts : [] }; }
      api.live = true; STATUS = 'ready'; announce();
    }).catch(function () { STATUS = 'error'; announce(); });
  }

  function demo() {
    var now = new Date(), iso = function (daysAgo) { var d = new Date(now); d.setDate(d.getDate() - daysAgo); return d.toISOString(); };
    var due = new Date(now); due.setDate(due.getDate() + 3); due.setHours(23, 59, 0, 0);
    var out = {};
    for (var k in COURSES) out[k] = { name: COURSES[k].name, link: 'https://classroom.google.com', posts: [
      { id: k + '1', kind: 'announcement', title: '', text: 'Reminder: bring your graphing calculator tomorrow. We start the new unit with a short warm-up, then notes.\nThe memory aid for this unit is on the course page.', topic: '', posted: iso(0), link: 'https://classroom.google.com', due: null, points: null, files: [] },
      { id: k + '2', kind: 'assignment', title: 'Practice set 4.2', text: 'Complete problems 1–15. Show your work on each one. Use the example from class if you get stuck.', topic: 'Unit 4', posted: iso(1), link: 'https://classroom.google.com', due: { date: due.toISOString().slice(0, 10), time: due.toISOString() }, points: 20, files: [{ type: 'drive', title: 'Practice set 4.2.pdf', url: 'https://drive.google.com' }] },
      { id: k + '3', kind: 'material', title: 'Unit 4 notes and video', text: '', topic: 'Unit 4', posted: iso(3), link: 'https://classroom.google.com', due: null, points: null, files: [{ type: 'youtube', title: 'Lesson video', url: 'https://www.youtube.com' }, { type: 'link', title: 'Desmos graph', url: 'https://www.desmos.com' }] },
      { id: k + '4', kind: 'question', title: 'Exit ticket: which method did you use?', text: 'Answer in one or two sentences.', topic: 'Unit 4', posted: iso(5), link: 'https://classroom.google.com', due: null, points: 5, files: [] },
      { id: k + '5', kind: 'announcement', title: '', text: 'Welcome back! This week’s plan is on the calendar above.', topic: '', posted: iso(9), link: 'https://classroom.google.com', due: null, points: null, files: [] }
    ] };
    return out;
  }

  var api = window.HubClassroom = {
    element: function (props) { return visible() ? element(props) : null; },
    status: function () { return STATUS; },
    visible: visible,
    reload: load,
    live: false,
    _test: { segsOf: segsOf, cutAt: cutAt, cutSegs: cutSegs, dueLabel: dueLabel, postedLabel: postedLabel }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else setTimeout(load, 0);
})();
