// Memory aid library: one list feeds the Memory Aids page and every course page.
// courses: ids (geo, alg1, alg3, g7, g8, alg2) or 'all'. topic: one of TOPICS.
(function () {
  if (window.HubAids) return;
  var TOPICS = ['Number Sense', 'Algebra', 'Geometry', 'Statistics', 'Problem Solving'];
  var AIDS = [
    { title: 'Quadrilaterals', file: 'memory-aids/quadrilaterals.pdf', courses: ['geo'], topic: 'Geometry' },
    { title: 'Rounding Rules', file: 'memory-aids/rounding-rules.pdf', courses: ['g7'], topic: 'Number Sense' },
    { title: 'Place Value', file: 'memory-aids/place-value.pdf', courses: ['g7'], topic: 'Number Sense' },
    { title: 'Divisibility Rules', file: 'memory-aids/divisibility-rules.pdf', courses: ['g7'], topic: 'Number Sense' },
    { title: 'Perfect Squares', file: 'memory-aids/perfect-squares.pdf', courses: ['g8', 'alg1'], topic: 'Number Sense' },
    { title: 'Inequalities', file: 'memory-aids/inequalities.pdf', courses: ['g7', 'g8', 'alg1'], topic: 'Algebra' },
    { title: 'Sequences and Series', file: 'memory-aids/sequences-and-series.pdf', courses: ['alg3'], topic: 'Algebra' },
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
      return pdfjs.getDocument(file).promise.then(function (doc) { return doc.getPage(1); }).then(function (page) {
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
  window.HubAids = { topics: TOPICS, aids: AIDS, forCourse: forCourse, thumb: thumb };
  window.dispatchEvent(new Event('hubaids-ready'));
})();
