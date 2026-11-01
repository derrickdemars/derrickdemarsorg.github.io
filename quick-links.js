// Quick links: main tiles, the home page's links for course pages, and course-specific extras.
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
    drive: { label: 'Google Drive', icon: 'folder', home: 'https://drive.google.com' },
    kuta: { label: 'Kuta Works', icon: 'edit_note', home: 'https://student.works.kutasoftware.com/signin' }
  };
  // Course pages show the home page's quick links as a button row. Keep these in sync with LINKS in /index.html.
  var HOME = [
    { name: 'Google Classroom', icon: 'school', url: 'https://classroom.google.com' },
    { name: 'Gradelink', icon: 'account_box', url: 'https://www.gradelink.com' },
    { name: 'Desmos', icon: 'function', url: 'https://www.desmos.com/calculator' },
    { name: 'GeoGebra', icon: 'change_history', url: 'https://www.geogebra.org' },
    { name: 'IXL', icon: 'checklist', url: 'https://www.ixl.com' },
    { name: 'Wayground', icon: 'travel_explore', url: 'https://wayground.com' }
  ];
  // Extra course-specific buttons. Placeholder URLs ('') point to the tool's home page.
  var COURSE = {
    geo: [{ tool: 'drive', title: 'Answer keys', url: '', teacherOnly: true, answerKey: true }],
    alg3: [{ tool: 'kuta', title: 'Kuta Works', url: 'https://student.works.kutasoftware.com/signin' }]
  };
  // who: 'teacher' (Dr. DeMars) sees everything; 'sub' and 'staff' (Staff login) also see answer keys; anyone else sees public links.
  function forCourse(id, who) {
    var teacher = who === true || who === 'teacher', sub = who === 'sub' || who === 'staff';
    var out = HOME.map(function (l) { return { name: l.name, icon: l.icon, href: l.url, teacherOnly: false }; });
    (COURSE[id] || []).forEach(function (l) {
      if (l.teacherOnly && !teacher && !(sub && l.answerKey)) return;
      out.push({ name: l.title, icon: TOOLS[l.tool].icon, href: l.url || TOOLS[l.tool].home, teacherOnly: !!l.teacherOnly });
    });
    return out;
  }
  window.HubLinks = {
    main: MAIN, home: HOME, tools: TOOLS, course: COURSE,
    forCourse: forCourse
  };
  window.dispatchEvent(new Event('hublinks-ready'));
})();
