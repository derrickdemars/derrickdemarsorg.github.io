// Quick links: one list feeds the Quick Links on the home page and on every course page.
//
// To add a link, put it in LINKS with the group it belongs to. Within each group, links show in
// alphabetical order by name, so a new link lands in its place on its own.
//   group:   'accounts' (School accounts), 'practice' (Practice) or 'tools' (Math tools)
//   desc:    the short line under the name on the home page
//   courses: leave it out to show the link on Home and every course page; or list where it shows:
//            'home' and/or course ids (geo, alg1, alg2, alg3, g7, g8), e.g. ['home', 'alg3']
(function () {
  if (window.HubLinks) return;
  var GROUPS = [
    { id: 'accounts', label: 'School accounts' },
    { id: 'practice', label: 'Practice' },
    { id: 'tools', label: 'Math tools' }
  ];
  var LINKS = [
    { group: 'accounts', name: 'Google Classroom', desc: 'Class posts and assignments', icon: 'school', url: 'https://classroom.google.com' },
    { group: 'accounts', name: 'Gradelink', desc: 'School portal', icon: 'account_box', url: 'https://www.gradelink.com' },
    { group: 'practice', name: 'Edmentum', desc: 'Online lessons and practice', icon: 'laptop_chromebook', url: 'https://auth.edmentum.com/elf/login' },
    { group: 'practice', name: 'IXL', desc: 'Skill practice', icon: 'checklist', url: 'https://www.ixl.com' },
    { group: 'practice', name: 'Kuta Works', desc: 'Online assignments', icon: 'edit_note', url: 'https://student.works.kutasoftware.com/signin', courses: ['home', 'alg3'] },
    { group: 'practice', name: 'MajorClarity', desc: 'Career and college readiness', icon: 'explore', url: 'https://app.paper.co/majorclarity' },
    { group: 'practice', name: 'Wayground', desc: 'Quizzes and lessons', icon: 'travel_explore', url: 'https://wayground.com' },
    { group: 'tools', name: 'Desmos', desc: 'Graphing calculator', icon: 'function', url: 'https://www.desmos.com/calculator' },
    { group: 'tools', name: 'GeoGebra', desc: 'Geometry tools', icon: 'change_history', url: 'https://www.geogebra.org' }
  ];
  // The links for one place ('home' or a course id), as groups in order, each sorted by name.
  function groupsFor(where) {
    return GROUPS.map(function (g) {
      var links = LINKS.filter(function (l) { return l.group === g.id && (!l.courses || l.courses.indexOf(where) >= 0); })
        .slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }); })
        .map(function (l) { return { name: l.name, desc: l.desc, icon: l.icon, url: l.url, href: l.url }; });
      return { id: g.id, label: g.label, links: links };
    }).filter(function (g) { return g.links.length; });
  }
  window.HubLinks = {
    groups: GROUPS, links: LINKS,
    forHome: function () { return groupsFor('home'); },
    forCourse: function (id) { return groupsFor(id); }
  };
  window.dispatchEvent(new Event('hublinks-ready'));
})();
