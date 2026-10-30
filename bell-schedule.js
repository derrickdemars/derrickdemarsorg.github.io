// Bell schedule + Dr. DeMars's class for each period. Same every day.
// Times are 24-hour "H:MM". c = course id; planning/quiet mark non-teaching rows.
(function () {
  if (window.HubBell) return;
  var PERIODS = [
    { label: 'Homeroom', start: '7:45', end: '8:15', c: 'geo', note: 'Geometry students', homeroom: true },
    { label: 'Period 1', start: '8:15', end: '9:05', c: 'geo' },
    { label: 'Period 2', start: '9:05', end: '9:58', c: 'alg1' },
    { label: 'Break/Snack', start: '9:58', end: '10:08', quiet: true, supervise: 'alg1', duty: 'Supervise the Algebra I class' },
    { label: 'Period 3', start: '10:11', end: '11:01', c: 'alg3' },
    { label: 'Period 4', start: '11:04', end: '11:58', c: 'g7' },
    { label: 'Lunch', start: '11:58', end: '12:28', quiet: true, duty: 'Held in the lunchroom' },
    { label: 'Period 5', start: '12:31', end: '13:21', c: 'g8' },
    { label: 'Period 6', start: '13:24', end: '14:15', c: 'alg2' },
    { label: 'Period 7', start: '14:18', end: '15:05', planning: true, note: 'Planning (no students)' },
    { label: 'Homeroom', start: '15:05', end: '15:15', c: 'geo', note: 'Geometry students', homeroom: true },
    { label: 'Dismissal', start: '15:15', end: null, quiet: true, duty: 'Help with car line' }
  ];
  function mins(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function clock(t) { var m = mins(t), h = Math.floor(m / 60), mm = ('0' + (m % 60)).slice(-2); return { text: ((h + 11) % 12 + 1) + ':' + mm, ampm: h < 12 ? 'AM' : 'PM' }; }
  function range(p) {
    var a = clock(p.start);
    if (!p.end) return a.text + ' ' + a.ampm;
    var b = clock(p.end);
    return a.ampm === b.ampm ? a.text + ' – ' + b.text + ' ' + b.ampm : a.text + ' ' + a.ampm + ' – ' + b.text + ' ' + b.ampm;
  }
  function nowMins(d) { d = d || new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function schoolDay(d) {
    d = d || new Date();
    var wd = d.getDay();
    if (wd === 0 || wd === 6) return false;
    try { // honor a "No school" day in the shared calendar
      var wk = window.HubCalendar && window.HubCalendar.week(0);
      if (wk) { var day = wk.days[wd - 1]; if (day && day.isToday && day.off) return false; }
    } catch (e) {}
    return true;
  }
  function list() {
    var t = nowMins();
    var on = schoolDay();
    return PERIODS.map(function (p, i) {
      var s = mins(p.start), e = p.end ? mins(p.end) : s + 1;
      return { label: p.label, time: range(p), c: p.c || null, supervise: p.supervise || null, duty: p.duty || '', note: p.note || '', quiet: !!p.quiet, planning: !!p.planning, homeroom: !!p.homeroom, isNow: on && t >= s && t < e };
    });
  }
  // Main class period for a course (not homeroom)
  function classFor(id) { for (var i = 0; i < PERIODS.length; i++) if (PERIODS[i].c === id && !PERIODS[i].homeroom) return PERIODS[i]; return null; }
  // { now: courseId|null, next: {c, at}|null } for the Home tiles
  function status() {
    if (!schoolDay()) return { now: null, next: null };
    var t = nowMins();
    var classes = PERIODS.filter(function (p) { return p.c && !p.homeroom; });
    for (var i = 0; i < classes.length; i++) {
      var p = classes[i];
      if (t >= mins(p.start) && t < mins(p.end)) return { now: p.c, next: null };
    }
    for (var j = 0; j < classes.length; j++) {
      if (mins(classes[j].start) > t) return { now: null, next: { c: classes[j].c, at: clock(classes[j].start).text } };
    }
    return { now: null, next: null };
  }
  window.HubBell = {
    periods: PERIODS, list: list, status: status,
    timeFor: function (id) { var p = classFor(id); return p ? range(p) : ''; }
  };
  window.dispatchEvent(new Event('hubbell-ready'));
})();
