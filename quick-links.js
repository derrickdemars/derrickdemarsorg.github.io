// Quick links: main tiles + course-specific links. Feeds the Quick Links page and every course page.
// Course links with placeholder URLs point to each tool's home page until real links are added.
(function () {
  if (window.HubLinks) return;
  var MAIN = [
    { name: 'Google Classroom', desc: 'Class posts and assignments', icon: 'school', url: 'https://classroom.google.com' },
    { name: 'Gradelink', desc: 'School portal', icon: 'account_box', url: 'https://www.gradelink.com' },
    { name: 'Innova Prep', desc: 'School website', icon: 'apartment', url: 'https://www.innovaprep.org/' },
    { name: 'Desmos', desc: 'Graphing calculator', icon: 'function', url: 'https://www.desmos.com/calculator' },
    { name: 'GeoGebra', desc: 'Geometry and graphing tools', icon: 'change_history', url: 'https://www.geogebra.org' },
    { name: 'IXL', desc: 'Skill practice', icon: 'checklist', url: 'https://www.ixl.com' },
    { name: 'YouTube', desc: 'Lesson videos', icon: 'smart_display', url: 'https://www.youtube.com' },
    { name: 'Wayground', desc: 'Quizzes and lessons', icon: 'travel_explore', url: 'https://wayground.com' }
  ];
  var TOOLS = {
    classroom: { label: 'Google Classroom', icon: 'school', home: 'https://classroom.google.com' },
    desmos: { label: 'Desmos', icon: 'function', home: 'https://www.desmos.com/calculator' },
    geogebra: { label: 'GeoGebra', icon: 'change_history', home: 'https://www.geogebra.org' },
    ixl: { label: 'IXL', icon: 'checklist', home: 'https://www.ixl.com' },
    wayground: { label: 'Wayground', icon: 'travel_explore', home: 'https://wayground.com' },
    drive: { label: 'Google Drive', icon: 'folder', home: 'https://drive.google.com' }
  };
  var TOOL_ORDER = ['classroom', 'desmos', 'geogebra', 'ixl', 'wayground', 'drive'];
  function L(tool, title, extra) { var o = { tool: tool, title: title, url: '' }; for (var k in extra) o[k] = extra[k]; return o; }
  var COURSE = {
    geo: [L('classroom', 'Geometry class'), L('desmos', 'Trig ratio sliders'), L('geogebra', 'Right triangle explorer'), L('geogebra', 'Dilation explorer'), L('ixl', 'Geometry skill plan'), L('wayground', 'Similarity review quiz'), L('drive', 'Answer keys folder', { teacherOnly: true, answerKey: true })],
    alg1: [L('classroom', 'Algebra I class'), L('desmos', 'Slope-intercept explorer'), L('geogebra', 'Systems of equations explorer'), L('ixl', 'Algebra I skill plan'), L('wayground', 'Linear functions quiz')],
    alg3: [L('classroom', 'Algebra III class'), L('desmos', 'Sequences grapher'), L('geogebra', 'Conic sections explorer'), L('ixl', 'Algebra III skill plan'), L('wayground', 'Matrices quiz')],
    g7: [L('classroom', '7th Grade Math class'), L('desmos', 'Proportional relationships'), L('geogebra', 'Angles explorer'), L('ixl', '7th grade skill plan'), L('wayground', 'Ratios quiz')],
    g8: [L('classroom', '8th Grade Math class'), L('desmos', 'Linear or nonlinear?'), L('geogebra', 'Transformations explorer'), L('ixl', '8th grade skill plan'), L('wayground', 'Pythagorean theorem quiz')],
    alg2: [L('classroom', 'Algebra II class'), L('desmos', 'Parent functions'), L('geogebra', 'Unit circle explorer'), L('ixl', 'Algebra II skill plan'), L('wayground', 'Quadratics quiz')]
  };
  // Group links by tool. who: 'teacher' sees everything; 'sub' also sees answer keys; anyone else sees public links.
  function group(list, who) {
    var teacher = who === true || who === 'teacher', sub = who === 'sub';
    var out = [];
    TOOL_ORDER.forEach(function (t) {
      var items = list.filter(function (l) { return l.tool === t && (teacher || !l.teacherOnly || (sub && l.answerKey)); })
        .map(function (l) { var o = {}; for (var k in l) o[k] = l[k]; o.href = l.url || TOOLS[t].home; o.placeholder = !l.url; return o; });
      if (items.length) out.push({ tool: t, label: TOOLS[t].label, icon: TOOLS[t].icon, items: items });
    });
    return out;
  }
  window.HubLinks = {
    main: MAIN, tools: TOOLS, course: COURSE,
    forCourse: function (id, teacher) { return group(COURSE[id] || [], teacher); },
    group: group
  };
  window.dispatchEvent(new Event('hublinks-ready'));
})();
