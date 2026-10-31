// Shared weekly calendar data for Home and every course page.
// w: 0 = this week, 1 = next week. d: 0 = Monday ... 4 = Friday.
// t: 'test' (filled chip), 'due' (outlined chip), 'event' (banner), 'off' (no school, shaded column).
// c: course id (geo, alg1, alg3, g7, g8, alg2) or null for school-wide items.
// Live data: once the Worker is set up (CALENDAR-SETUP.md), events come from your Google Calendar and
// the list below is only a fallback for when Google can't be reached.
(function () {
  if (window.HubCalendar) return;
  var EVENTS = []; // filled from Google Calendar (see CALENDAR-SETUP.md)
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
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
  function week(offset) {
    var m = monday(offset), t = today(), days = [];
    for (var d = 0; d < 5; d++) {
      var dt = new Date(m); dt.setDate(m.getDate() + d);
      var evs = EVENTS.filter(function (e) { return e.w === offset && e.d === d; });
      var off = evs.filter(function (e) { return e.t === 'off'; })[0];
      days.push({
        name: fmt(dt, { weekday: 'long' }),
        date: fmt(dt, { month: 'short', day: 'numeric' }),
        isToday: dt.getTime() === t.getTime(),
        off: !!off, offLabel: off ? off.title : '',
        events: evs.filter(function (e) { return e.t === 'event'; }).map(function (e) { return e.title; }),
        items: evs.filter(function (e) { return e.c && (e.t === 'test' || e.t === 'due'); })
      });
    }
    var f = new Date(m), l = new Date(m); l.setDate(m.getDate() + 4);
    var range = f.getMonth() === l.getMonth()
      ? fmt(f, { month: 'short', day: 'numeric' }) + ' – ' + l.getDate()
      : fmt(f, { month: 'short', day: 'numeric' }) + ' – ' + fmt(l, { month: 'short', day: 'numeric' });
    return { label: (offset === 0 ? 'This week' : 'Next week') + ' · ' + range, days: days };
  }
  // Google Calendar titles: "GEO Quiz: Similarity" -> Geometry test chip. Tags: G7 G8 ALG1 GEO ALG2 ALG3.
  var TAGS = { g7: 'g7', g8: 'g8', alg1: 'alg1', geo: 'geo', alg2: 'alg2', alg3: 'alg3' };
  function fromGoogle(list) {
    var m0 = monday(0), out = [];
    list.forEach(function (e) {
      var p = String(e.date || '').split('-').map(Number); if (p.length !== 3) return;
      var dt = new Date(p[0], p[1] - 1, p[2]);
      var diff = Math.round((dt - m0) / 86400000), w = Math.floor(diff / 7), d = diff - w * 7;
      if (w < 0 || w > 1 || d > 4) return;
      var title = String(e.title || '').trim(), m = title.match(/^(g7|g8|alg1|geo|alg2|alg3)\b[\s:\u2013\u2014-]*/i);
      var course = m ? TAGS[m[1].toLowerCase()] : null;
      if (m) title = title.slice(m[0].length).trim();
      var t = course ? (/\b(quiz|test|exam)\b/i.test(title) ? 'test' : 'due') : (/no school/i.test(title) ? 'off' : 'event');
      out.push({ w: w, d: d, c: course, t: t, title: title });
    });
    return out;
  }
  function loadLive() {
    var base = window.HubState && window.HubState.apiBase;
    if (!base || !window.fetch) return;
    fetch(base + '/api/calendar', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.ok || !Array.isArray(d.events)) return;
      EVENTS.length = 0; Array.prototype.push.apply(EVENTS, fromGoogle(d.events));
      window.HubCalendar.live = true;
      window.dispatchEvent(new Event('hubcal-ready'));
    }).catch(function () {});
  }
  window.HubCalendar = { events: EVENTS, week: week, live: false };
  window.dispatchEvent(new Event('hubcal-ready'));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLive); else setTimeout(loadLive, 0);
})();
