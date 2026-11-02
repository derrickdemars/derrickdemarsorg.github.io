// Miscellaneous Resources: one list (misc-resources.json) feeds the Resources page.
// The list is committed to the repo. Uploads, edits and deletes go through the demars-hub Worker
// (see WORKER-UPLOADS.md), which commits to GitHub; GitHub Pages then rebuilds in a minute or two.
//
// Each item in misc-resources.json:
//   { id, name, file, size, type, courses: [ids], categories: [ids], description, keywords: [], uploaded, updated }
//   courses: g7, g8, alg1, geo, alg2, alg3.  categories: ws (Worksheets & Study Guides), media (Images & Videos), inter (Interactives).
//   file: path from the site root, e.g. misc-resources/worksheets/factoring-practice.pdf
(function () {
  if (window.HubResources) return;
  var COURSES = [
    { id: 'g7', name: '7th Grade Math', icon: 'square_foot', fill: 'oklch(0.74 0.17 150)', radius: '24px' },
    { id: 'g8', name: '8th Grade Math', icon: 'straighten', fill: 'oklch(0.69 0.15 250)', radius: '50%' },
    { id: 'alg1', name: 'Algebra I', icon: 'calculate', fill: 'oklch(0.76 0.16 55)', radius: '24px' },
    { id: 'geo', name: 'Geometry', icon: 'architecture', fill: 'oklch(0.67 0.19 300)', radius: '50%' },
    { id: 'alg2', name: 'Algebra II', icon: 'show_chart', fill: 'oklch(0.67 0.2 25)', radius: '24px' },
    { id: 'alg3', name: 'Algebra III', icon: 'ssid_chart', fill: 'oklch(0.88 0.16 95)', radius: '50%' }
  ];
  var CATEGORIES = [
    { id: 'ws', name: 'Worksheets & Study Guides', icon: 'description', folder: 'worksheets' },
    { id: 'media', name: 'Images & Videos', icon: 'perm_media', folder: 'images-videos' },
    { id: 'inter', name: 'Interactives', icon: 'touch_app', folder: 'interactives' }
  ];
  var TYPES = ['PDF', 'Image', 'Video', 'Audio', 'HTML', 'TeX', 'ZIP', 'Other'];
  var EXT = {
    pdf: 'PDF', png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image', svg: 'Image', bmp: 'Image', heic: 'Image',
    mp4: 'Video', webm: 'Video', mov: 'Video', m4v: 'Video', mkv: 'Video',
    mp3: 'Audio', wav: 'Audio', m4a: 'Audio', ogg: 'Audio', aac: 'Audio', flac: 'Audio',
    html: 'HTML', htm: 'HTML', tex: 'TeX', zip: 'ZIP'
  };
  var ICON = { PDF: 'picture_as_pdf', Image: 'image', Video: 'movie', Audio: 'music_note', HTML: 'web', TeX: 'functions', ZIP: 'folder_zip', Other: 'draft' };
  var MAX_BYTES = 95 * 1024 * 1024, WARN_BYTES = 25 * 1024 * 1024;
  var LIST_URL = 'misc-resources.json';

  function ext(name) { var m = /\.([A-Za-z0-9]+)$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; }
  function typeOf(name) { return EXT[ext(name)] || 'Other'; }
  function courseName(id) { for (var i = 0; i < COURSES.length; i++) if (COURSES[i].id === id) return COURSES[i].name; return id; }
  function categoryName(id) { for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i].name; return id; }
  function fmtSize(b) {
    b = +b || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
    return (b / 1073741824).toFixed(1) + ' GB';
  }
  function fmtDate(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  // A short, safe file name for the repo: letters, digits, dashes, one extension.
  function slugFile(name) {
    var e = ext(name), base = String(name || '').replace(/\.[A-Za-z0-9]+$/, '');
    base = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file';
    return e ? base + '.' + e : base;
  }
  function words(s) { return String(s || '').toLowerCase().split(/[^a-z0-9.+#]+/).filter(Boolean); }

  // Search: every word typed must appear in the name, keywords, description, course names, category names or file type.
  function matches(item, q) {
    var terms = words(q); if (!terms.length) return true;
    var hay = [item.name, item.description, (item.keywords || []).join(' '), (item.courses || []).map(courseName).join(' '),
      (item.categories || []).map(categoryName).join(' '), item.type, ext(item.file)].join(' ').toLowerCase();
    for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) < 0) return false;
    return true;
  }
  function inRange(item, range) {
    if (!range || range === 'all') return true;
    var days = { week: 7, month: 31, year: 366 }[range] || 0, t = new Date(item.uploaded).getTime();
    return !isNaN(t) && Date.now() - t <= days * 86400000;
  }
  function normalize(it) {
    return {
      id: String(it.id || ''), name: String(it.name || it.file || ''), file: String(it.file || ''), size: +it.size || 0,
      type: TYPES.indexOf(it.type) >= 0 ? it.type : typeOf(it.file),
      courses: Array.isArray(it.courses) ? it.courses : [], categories: Array.isArray(it.categories) ? it.categories : [],
      description: String(it.description || ''), keywords: Array.isArray(it.keywords) ? it.keywords : [],
      uploaded: String(it.uploaded || ''), updated: String(it.updated || it.uploaded || '')
    };
  }

  var R = {
    courses: COURSES, categories: CATEGORIES, types: TYPES, typeIcon: ICON, maxBytes: MAX_BYTES, warnBytes: WARN_BYTES,
    items: null, error: '',
    ext: ext, typeOf: typeOf, courseName: courseName, categoryName: categoryName, fmtSize: fmtSize, fmtDate: fmtDate, slugFile: slugFile,
    matches: matches, inRange: inRange,
    // Fetch the committed list. bust=true skips the browser cache (used while waiting for GitHub Pages).
    load: function (bust) {
      var url = LIST_URL + (bust ? '?t=' + Date.now() : '');
      return fetch(url, { cache: bust ? 'no-store' : 'default' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) {
          R.items = (d && Array.isArray(d.items) ? d.items : []).map(normalize).filter(function (i) { return i.id && i.file; });
          R.error = '';
          window.dispatchEvent(new CustomEvent('hubresources-ready', { detail: R.items }));
          return R.items;
        })
        .catch(function (e) { R.error = e && e.message || 'load failed'; if (!R.items) R.items = []; window.dispatchEvent(new CustomEvent('hubresources-ready', { detail: R.items })); return R.items; });
    },
    // Worker calls (teacher only). Each resolves the Worker's JSON: { ok, item?, message? }.
    upload: function (meta, file) {
      var H = window.HubState; if (!H || !H.get().teacher) return Promise.resolve({ ok: false, message: 'Sign in as Dr. DeMars first.' });
      var fd = new FormData(); fd.append('meta', JSON.stringify(meta)); fd.append('file', file, file.name);
      return H.api('/api/resources/upload', { method: 'POST', body: fd });
    },
    update: function (meta) {
      var H = window.HubState; if (!H || !H.get().teacher) return Promise.resolve({ ok: false, message: 'Sign in as Dr. DeMars first.' });
      return H.api('/api/resources/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
    },
    remove: function (id) {
      var H = window.HubState; if (!H || !H.get().teacher) return Promise.resolve({ ok: false, message: 'Sign in as Dr. DeMars first.' });
      return H.api('/api/resources/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) });
    }
  };
  window.HubResources = R;
  R.load(false);
})();
