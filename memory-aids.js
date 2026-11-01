// Memory aid library: one list feeds the Memory Aids page and every course page.
// courses: ids (geo, alg1, alg3, g7, g8, alg2) or 'all'. topic: one of TOPICS.
// keywords: words or phrases (any capitalization) that tie an aid to a quiz, test or exam. When one appears in
//   the title or description of an upcoming quiz/test for that course on the calendar, the aid moves up on that
//   course page. Edit them freely; give each new aid a few. Whole words only: 'arc' matches "Arc length", not "search".
//
// Course pages show three aids (HubAids.top), chosen in this order:
//   1. Linked or attached in that course's Classroom posts from the last 30 days, most recent post first.
//      A link counts if it points to the aid's PDF; an attachment counts if its name is the aid's title or file name.
//   2. Keywords found in a quiz/test/exam for that course in the calendar's two weeks, soonest first.
//   3. Opened or downloaded on this device in the last 30 days, most recent first (kept only in this browser).
//   4. The list order below.
(function () {
  if (window.HubAids) return;
  var TOPICS = ['Number Sense', 'Algebra', 'Geometry', 'Statistics', 'Problem Solving'];
  var AIDS = [
    { title: 'Quadrilaterals', file: 'memory-aids/quadrilaterals.pdf', courses: ['geo'], topic: 'Geometry', keywords: ['quadrilateral', 'parallelogram', 'rectangle', 'rhombus', 'trapezoid', 'kite'] },
    { title: 'Angle Relationships', file: 'memory-aids/angle-relationships.pdf', courses: ['g7', 'g8', 'geo'], topic: 'Geometry', keywords: ['angle', 'vertical angles', 'supplementary', 'complementary', 'transversal', 'parallel lines'] },
    { title: 'The Pythagorean Theorem and Triangle Area', file: 'memory-aids/pythagorean-theorem-and-triangle-area.pdf', courses: ['g8', 'geo'], topic: 'Geometry', keywords: ['pythagorean', 'hypotenuse', 'right triangle', 'triangle area'] },
    { title: 'Right Triangle Trigonometry', file: 'memory-aids/right-triangle-trigonometry.pdf', courses: ['geo', 'alg2', 'alg3'], topic: 'Geometry', keywords: ['trig', 'trigonometry', 'sine', 'cosine', 'tangent', 'soh cah toa'] },
    { title: 'Reflections', file: 'memory-aids/reflections.pdf', courses: ['g8', 'geo'], topic: 'Geometry', keywords: ['reflection', 'reflections', 'reflect', 'transformation', 'transformations'] },
    { title: 'Circles', file: 'memory-aids/circles.pdf', courses: ['g7', 'geo'], topic: 'Geometry', keywords: ['circle', 'circles', 'arc', 'chord', 'circumference', 'sector'] },
    { title: 'Geometric Solids', file: 'memory-aids/geometric-solids.pdf', courses: ['g7', 'g8', 'geo'], topic: 'Geometry', keywords: ['solid', 'solids', 'prism', 'pyramid', 'cylinder', 'cone', 'sphere', 'volume', 'surface area'] },
    { title: 'Rounding Rules', file: 'memory-aids/rounding-rules.pdf', courses: ['g7'], topic: 'Number Sense', keywords: ['rounding', 'round', 'estimate', 'estimation'] },
    { title: 'Place Value', file: 'memory-aids/place-value.pdf', courses: ['g7'], topic: 'Number Sense', keywords: ['place value', 'digit', 'digits'] },
    { title: 'Divisibility Rules', file: 'memory-aids/divisibility-rules.pdf', courses: ['g7'], topic: 'Number Sense', keywords: ['divisibility', 'divisible', 'prime', 'gcf', 'lcm'] },
    { title: 'Perfect Squares', file: 'memory-aids/perfect-squares.pdf', courses: ['g8', 'alg1'], topic: 'Number Sense', keywords: ['perfect square', 'perfect squares', 'square root', 'square roots', 'radical'] },
    { title: 'Inequalities', file: 'memory-aids/inequalities.pdf', courses: ['g7', 'g8', 'alg1'], topic: 'Algebra', keywords: ['inequality', 'inequalities'] },
    { title: 'Factoring Quadratics by Grouping', file: 'memory-aids/factoring-quadratics-by-grouping.pdf', courses: ['alg1', 'alg2'], topic: 'Algebra', keywords: ['factor', 'factoring', 'quadratic', 'quadratics', 'grouping', 'trinomial'] },
    { title: 'Parent Functions and Transformations of Functions', file: 'memory-aids/parent-functions-and-transformations-of-functions.pdf', courses: ['alg1', 'alg2', 'alg3'], topic: 'Algebra', keywords: ['parent function', 'parent functions', 'transformation', 'transformations', 'translation', 'function', 'functions'] },
    { title: 'Sequences and Series', file: 'memory-aids/sequences-and-series.pdf', courses: ['alg3'], topic: 'Algebra', keywords: ['sequence', 'sequences', 'series', 'arithmetic', 'geometric sequence'] },
    { title: 'Polar Coordinates', file: 'memory-aids/polar-coordinates.pdf', courses: ['alg3'], topic: 'Geometry', keywords: ['polar', 'polar coordinates'] },
    { title: 'Statistical Terms', file: 'memory-aids/statistical-terms.pdf', courses: ['g7', 'alg3'], topic: 'Statistics', keywords: ['statistics', 'statistical', 'data', 'sample', 'population'] },
    { title: 'Central Tendency', file: 'memory-aids/central-tendency.pdf', courses: ['g7', 'alg3'], topic: 'Statistics', keywords: ['mean', 'median', 'mode', 'central tendency'] },
    { title: 'Percentiles, Range, Quartiles, Interquartile Range', file: 'memory-aids/percentiles-range-quartiles-iqr.pdf', courses: ['g7', 'alg3'], topic: 'Statistics', keywords: ['percentile', 'percentiles', 'quartile', 'quartiles', 'iqr', 'interquartile', 'box plot'] },
    { title: 'Venn Diagrams', file: 'memory-aids/venn-diagrams.pdf', courses: ['g7', 'alg3'], topic: 'Statistics', keywords: ['venn', 'venn diagram', 'sets'] },
    { title: 'Keywords in Word Problems', file: 'memory-aids/keywords-in-word-problems.pdf', courses: ['all'], topic: 'Problem Solving', keywords: ['word problem', 'word problems'] }
  ];
  function forCourse(id) { return AIDS.filter(function (a) { return a.courses.indexOf('all') >= 0 || a.courses.indexOf(id) >= 0; }); }

  // First-page thumbnails, rendered in the browser with pdf.js and cached for the visit.
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/';
  var lib = null, cache = {};
  function loadLib() {
    if (!lib) lib = import(PDFJS + 'pdf.min.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; return m; });
    return lib;
  }
  function thumb(file, width) {
    width = width || 160;
    var key = file + '@' + width;
    if (!cache[key]) cache[key] = loadLib().then(function (pdfjs) {
      // pdf.js resolves relative paths against the page URL and ignores <base href="/">, so resolve against the base first.
      return pdfjs.getDocument(new URL(file, document.baseURI).href).promise.then(function (doc) { return doc.getPage(1); }).then(function (page) {
        var v = page.getViewport({ scale: 1 }), scale = (width * 2) / v.width, vp = page.getViewport({ scale: scale });
        var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
        return page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(function () {
          // blob: URLs avoid the ';' inside data: URLs, which breaks inline style parsing
          return new Promise(function (res) { c.toBlob(function (b) { res(b ? URL.createObjectURL(b) : ''); }, 'image/png'); });
        });
      });
    }).catch(function () { return ''; });
    return cache[key];
  }
  // Loading spinner for thumbnails: same ring as the calendar (hcal-spin), scaled to the 64x84 box.
  // The ring stays invisible for 250 ms so fast loads skip it; with motion off it pulses instead of spinning.
  var CSS = [
    '.hubaid-spin{width:28px;height:28px;box-sizing:border-box;border-radius:50%;border:3px solid var(--line);border-top-color:var(--ink);opacity:0;animation:hubaid-show 0s linear 250ms forwards,hubaid-rot 0.9s linear infinite;}',
    '.hubaid-spin.hubaid-calm{border-color:var(--ink);animation:hubaid-pulse 1.6s ease-in-out 250ms infinite;}',
    '.hubaid-img{position:absolute;inset:0;animation:hubaid-fade var(--vt,280ms) ease both;}',
    '@keyframes hubaid-show{to{opacity:1;}}',
    '@keyframes hubaid-rot{to{transform:rotate(360deg);}}',
    '@keyframes hubaid-pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}',
    '@keyframes hubaid-fade{from{opacity:0;}to{opacity:1;}}',
    '@media (prefers-reduced-motion: reduce){.hubaid-spin{border-color:var(--ink);animation:hubaid-pulse 1.6s ease-in-out 250ms infinite;}.hubaid-img{animation:none;}}'
  ].join('\n');
  try { var st = document.createElement('style'); st.id = 'hubaid-css'; st.textContent = CSS; document.head.appendChild(st); } catch (e) {}

  // Motion off: the site's setting zeroes --dur (hub-state.js), and the OS "reduce motion" setting counts too.
  function calm() {
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch (e) {}
    var v = (getComputedStyle(document.documentElement).getPropertyValue('--dur') || '').trim(), n = parseFloat(v);
    return !isNaN(n) && n === 0;
  }

  // Display fields for one thumbnail box: loading (dark box + spinner), ready (white box + fade-in), or failed (white box + icon).
  function view(file, thumbs, failed) {
    var url = thumbs && thumbs[file], bad = !url && !!(failed && failed[file]), loading = !url && !bad;
    return {
      boxBg: loading ? 'var(--surface2)' : '#fff',
      thumbBg: url ? '#fff url(' + url + ') top / cover no-repeat' : '#fff',
      thumbLoading: loading, hasThumb: !!url, thumbFailed: bad,
      spinClass: 'hubaid-spin' + (calm() ? ' hubaid-calm' : '')
    };
  }

  // ---------- opens on this device ----------
  // Any click on a link to a memory-aid PDF (thumbnail, Open, Download, on any page) is remembered here:
  // the last 20 opens, kept for 30 days, only in this browser.
  var RECENT_KEY = 'hub-aid-opens', RECENT_MAX = 20, DAY = 864e5, WINDOW = 30 * DAY;
  var BY_FILE = {}; AIDS.forEach(function (a) { BY_FILE[a.file] = a; });
  function readRecent() {
    try { var v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function fileOf(href) {
    try { var p = new URL(href, document.baseURI).pathname.replace(/^\/+/, ''); return BY_FILE[decodeURIComponent(p)] ? decodeURIComponent(p) : ''; } catch (e) { return ''; }
  }
  function remember(file) {
    var now = Date.now(), list = readRecent().filter(function (x) { return x && x.f !== file && now - x.t < WINDOW; });
    list.unshift({ f: file, t: now });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch (e) {}
  }
  function onOpen(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    var file = a ? fileOf(a.getAttribute('href')) : '';
    if (file) remember(file);
  }
  document.addEventListener('click', onOpen, true);
  document.addEventListener('auxclick', onOpen, true); // middle-click opens in a new tab

  // ---------- which three a course page shows ----------
  function norm(s) { return String(s || '').toLowerCase().replace(/\.pdf$/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function kwHit(aid, text) {
    return (aid.keywords || []).some(function (k) {
      k = String(k || '').trim(); if (!k) return false;
      return new RegExp('(^|[^a-z0-9])' + esc(k.toLowerCase()) + '($|[^a-z0-9])').test(text);
    });
  }
  // Aids linked or attached in the course's Classroom posts from the last 30 days, most recent post first.
  function fromClassroom(course, aids) {
    var C = window.HubClassroom, posts = C && C.posts ? C.posts(course) : [], now = Date.now(), out = [];
    posts.filter(function (p) { var t = Date.parse(p && p.posted); return !isNaN(t) && now - t < WINDOW; })
      .sort(function (a, b) { return Date.parse(b.posted) - Date.parse(a.posted); })
      .forEach(function (p) {
        var urls = (String(p.text || '').match(/https?:\/\/[^\s<>"')]+/g) || []).concat(p.link ? [p.link] : []);
        var names = [];
        (p.files || []).forEach(function (f) { if (!f) return; if (f.url) urls.push(f.url); if (f.title) names.push(norm(f.title)); });
        aids.forEach(function (a) {
          var base = a.file.split('/').pop();
          var linked = urls.some(function (u) { try { return decodeURIComponent(new URL(u).pathname).replace(/^\/+/, '') === a.file; } catch (e) { return false; } });
          var named = names.indexOf(norm(a.title)) >= 0 || names.indexOf(norm(base)) >= 0;
          if (linked || named) out.push(a);
        });
      });
    return out;
  }
  // Aids whose keywords appear in an upcoming quiz/test/exam for the course (calendar's two weeks), soonest first.
  function fromAssessments(course, aids) {
    var HC = window.HubCalendar; if (!HC || !HC.events || !HC.week) return [];
    var ti = HC.week(0).days.findIndex(function (d) { return d.isToday; }), out = [];
    HC.events.filter(function (e) { return e.quiz && !e.ns && !e.hl && e.cs && e.cs.indexOf(course) >= 0 && !(e.w === 0 && ti >= 0 && e.d < ti); })
      .sort(function (a, b) { return (a.w - b.w) || (a.d - b.d); })
      .forEach(function (e) {
        var text = (String(e.title || '') + ' ' + String((e.desc && e.desc.text) || '')).toLowerCase();
        aids.forEach(function (a) { if (kwHit(a, text)) out.push(a); });
      });
    return out;
  }
  function fromRecent(aids) {
    var now = Date.now(), byFile = {}; aids.forEach(function (a) { byFile[a.file] = a; });
    return readRecent().filter(function (x) { return x && now - x.t < WINDOW && byFile[x.f]; }).map(function (x) { return byFile[x.f]; });
  }
  function top(course, n) {
    var aids = forCourse(course), seen = {}, out = [];
    [fromClassroom(course, aids), fromAssessments(course, aids), fromRecent(aids), aids].forEach(function (list) {
      list.forEach(function (a) { if (out.length < n && !seen[a.file]) { seen[a.file] = 1; out.push(a); } });
    });
    return out;
  }

  window.HubAids = { topics: TOPICS, aids: AIDS, forCourse: forCourse, thumb: thumb, calm: calm, view: view, top: top };
  window.dispatchEvent(new Event('hubaids-ready'));
})();
