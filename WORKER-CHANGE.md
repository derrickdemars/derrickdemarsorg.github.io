# Worker change: send descriptions, locations, and times

The site now reads five more fields from each event your Worker returns at `/api/calendar`.
Until you make this change, the site still works: descriptions, locations, and times just
don't appear yet, and every event is treated as all-day.

Each event in the Worker's response should look like this:

```json
{
  "date": "2026-11-03",
  "title": "Assembly",
  "allDay": false,
  "start": "2026-11-03T15:00:00.000Z",
  "end": "2026-11-03T16:00:00.000Z",
  "location": "Gym",
  "description": "Bring your student ID."
}
```

For an all-day event, `allDay` is `true` and `start` and `end` are `null`.
`date` is the event's day in Central time.

## Steps

1. Go to dash.cloudflare.com, open **Workers & Pages**, click **demars-hub**, then **Edit code**.
2. Find the part that handles `/api/calendar`. It downloads your calendar's `basic.ics` address and
   builds a list of events, each with `date` and `title`.
3. Paste the helper code below at the very bottom of the file.
4. Use **Option A** if your Worker already reads the `.ics` lines itself, or **Option B** to replace that part.
5. Click **Deploy**.
6. Open https://demars-hub.derrickdemars.workers.dev/api/calendar in a browser. Each event should now
   show `allDay`, `start`, `end`, `location`, and `description`.

If your Worker caches the calendar, the new fields show up after that cache expires.

## Helper code (paste at the bottom of the Worker)

```js
// ===== Teaching Hub calendar helpers (paste near the bottom of your Worker) =====
const HUB_TZ = 'America/Chicago';

// iCal wraps long lines (newline + space). Join them back before reading the file.
function icsUnfold(text) {
  return String(text || '').replace(/\r?\n[ \t]/g, '');
}

// Undo iCal escaping: \n -> line break, \, -> ,  \; -> ;  \\ -> \
function icsText(v) {
  return String(v || '').replace(/\\([nN,;\\])/g, (m, c) => (c === 'n' || c === 'N') ? '\n' : c);
}

// Minutes a time zone is ahead of UTC at a given moment (negative for Central).
function tzOffsetMinutes(utcMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(utcMs));
  const g = t => +parts.find(p => p.type === t).value;
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utcMs) / 60000;
}

// Read a DTSTART or DTEND line. params = the text between the name and the colon
// (e.g. ";VALUE=DATE" or ";TZID=America/Chicago"), value = the text after the colon.
// Returns { allDay, date: 'YYYY-MM-DD' in Central time, iso: exact time or null }.
function icsWhen(params, value) {
  value = String(value || '').trim(); params = String(params || '');
  if (/VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(value)) {
    return { allDay: true, date: value.slice(0, 4) + '-' + value.slice(4, 6) + '-' + value.slice(6, 8), iso: null };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  let ms = wall;
  if (!m[7]) { // not UTC: a wall-clock time in the event's time zone
    const tz = (params.match(/TZID=("?)([^;:"]+)\1/i) || [])[2] || HUB_TZ;
    try { ms = wall - tzOffsetMinutes(wall, tz) * 60000; ms = wall - tzOffsetMinutes(ms, tz) * 60000; }
    catch (e) { ms = wall - tzOffsetMinutes(wall, HUB_TZ) * 60000; }
  }
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: HUB_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  return { allDay: false, date: date, iso: new Date(ms).toISOString() };
}

// Turn one parsed VEVENT into what the site expects.
// summary, location, description: the raw text after the colon on those lines.
function hubEvent(summary, startParams, startValue, endParams, endValue, location, description) {
  const s = icsWhen(startParams, startValue), e = endValue ? icsWhen(endParams, endValue) : null;
  if (!s) return null;
  return {
    date: s.date,
    title: icsText(summary),
    allDay: s.allDay,
    start: s.iso,
    end: e && !e.allDay ? e.iso : null,
    location: icsText(location),
    description: icsText(description)
  };
}

// OPTION B only: a complete reader for the whole .ics file. Does not expand repeating events.
function hubEventsFromIcs(text) {
  const out = [];
  let cur = null;
  for (const line of icsUnfold(text).split(/\r?\n/)) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur && cur.DTSTART) {
        const ev = hubEvent(cur.SUMMARY && cur.SUMMARY.v, cur.DTSTART.p, cur.DTSTART.v,
          cur.DTEND && cur.DTEND.p, cur.DTEND && cur.DTEND.v,
          cur.LOCATION && cur.LOCATION.v, cur.DESCRIPTION && cur.DESCRIPTION.v);
        if (ev) out.push(ev);
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const m = line.match(/^([A-Za-z-]+)((?:;[^:]*)?):(.*)$/);
    if (m && !cur[m[1].toUpperCase()]) cur[m[1].toUpperCase()] = { p: m[2], v: m[3] };
  }
  return out;
}
```

## Option A: add the fields to your existing code

Where your Worker builds each event, it reads the `SUMMARY` and `DTSTART` lines. Also read the
`DTEND`, `LOCATION`, and `DESCRIPTION` lines the same way. For `DTSTART` and `DTEND`, keep the
part between the name and the colon. For example, in `DTSTART;TZID=America/Chicago:20261103T090000`
the params are `;TZID=America/Chicago` and the value is `20261103T090000`.

Then build each event with `hubEvent` instead of your current object:

```js
const ev = hubEvent(summary, startParams, startValue, endParams, endValue, location, description);
if (ev) events.push(ev);
```

Before splitting the file into lines, run it through `icsUnfold(text)`. Long descriptions are
wrapped across several lines in the `.ics` file and would otherwise be cut off.

## Option B: replace the reading code

If your Worker's reading code is hard to change, replace the part that turns the `.ics` text into
events with one line:

```js
const events = hubEventsFromIcs(icsText);
```

Keep anything your Worker already does after that, such as limiting events to the next few weeks.
Option B does not expand repeating events. If your current Worker handles repeating events, use
Option A instead, or paste your Worker into the chat and I'll fit the change to it.
