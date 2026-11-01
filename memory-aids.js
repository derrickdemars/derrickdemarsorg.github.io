// Memory aid library: one list feeds the Memory Aids page and every course page.
// courses: ids (geo, alg1, alg3, g7, g8, alg2) or 'all'. topic: one of TOPICS.
(function () {
  if (window.HubAids) return;
  var TOPICS = ['Number Sense', 'Algebra', 'Geometry', 'Statistics', 'Problem Solving'];
  var AIDS = [
    { title: 'Quadrilaterals', file: 'memory-aids/quadrilaterals.pdf', courses: ['geo'], topic: 'Geometry' },
    { title: 'Angle Relationships', file: 'memory-aids/angle-relationships.pdf', courses: ['g7', 'g8', 'geo'], topic: 'Geometry' },
    { title: 'The Pythagorean Theorem and Triangle Area', file: 'memory-aids/pythagorean-theorem-and-triangle-area.pdf', courses: ['g8', 'geo'], topic: 'Geometry' },
    { title: 'Reflections', file: 'memory-aids/reflections.pdf', courses: ['g8', 'geo'], topic: 'Geometry' },
    { title: 'Circles', file: 'memory-aids/circles.pdf', courses: ['g7', 'geo'], topic: 'Geometry' },
    { title: 'Geometric Solids', file: 'memory-aids/geometric-solids.pdf', courses: ['g7', 'g8', 'geo'], topic: 'Geometry' },
    { title: 'Rounding Rules', file: 'memory-aids/rounding-rules.pdf', courses: ['g7'], topic: 'Number Sense' },
    { title: 'Place Value', file: 'memory-aids/place-value.pdf', courses: ['g7'], topic: 'Number Sense' },
    { title: 'Divisibility Rules', file: 'memory-aids/divisibility-rules.pdf', courses: ['g7'], topic: 'Number Sense' },
    { title: 'Perfect Squares', file: 'memory-aids/perfect-squares.pdf', courses: ['g8', 'alg1'], topic: 'Number Sense' },
    { title: 'Inequalities', file: 'memory-aids/inequalities.pdf', courses: ['g7', 'g8', 'alg1'], topic: 'Algebra' },
    { title: 'Factoring Quadratics by Grouping', file: 'memory-aids/factoring-quadratics-by-grouping.pdf', courses: ['alg1', 'alg2'], topic: 'Algebra' },
    { title: 'Parent Functions and Transformations of Functions', file: 'memory-aids/parent-functions-and-transformations-of-functions.pdf', courses: ['alg1', 'alg2', 'alg3'], topic: 'Algebra' },
    { title: 'Sequences and Series', file: 'memory-aids/sequences-and-series.pdf', courses: ['alg3'], topic: 'Algebra' },
    { title: 'Polar Coordinates', file: 'memory-aids/polar-coordinates.pdf', courses: ['alg3'], topic: 'Geometry' },
    { title: 'Statistical Terms', file: 'memory-aids/statistical-terms.pdf', courses: ['g7', 'alg3'], topic: 'Statistics' },
    { title: 'Central Tendency', file: 'memory-aids/central-tendency.pdf', courses: ['g7', 'alg3'], topic: 'Statistics' },
    { title: 'Percentiles, Range, Quartiles, Interquartile Range', file: 'memory-aids/percentiles-range-quartiles-iqr.pdf', courses: ['g7', 'alg3'], topic: 'Statistics' },
    { title: 'Venn Diagrams', file: 'memory-aids/venn-diagrams.pdf', courses: ['g7', 'alg3'], topic: 'Statistics' },
    { title: 'Keywords in Word Problems', file: 'memory-aids/keywords-in-word-problems.pdf', courses: ['all'], topic: 'Problem Solving' }
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

  window.HubAids = { topics: TOPICS, aids: AIDS, forCourse: forCourse, thumb: thumb, calm: calm, view: view };
  window.dispatchEvent(new Event('hubaids-ready'));
})();
