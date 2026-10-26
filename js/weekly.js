// Weekly page: Monday–Sunday time grid with color-coded schedules.
const HOUR_PX = 44; // keep in sync with .wk-col's background in style.css
const WEEK_START_HOUR = 6;
const WEEK_END_HOUR = 24;

function renderWeekly(view, key) {
  const monday = startOfWeek(parseKey(key));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];
  const today = todayKey();
  const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);
  const title = monday.getMonth() === sunday.getMonth()
    ? `${fmt(monday, { month: "long", day: "numeric" })} – ${sunday.getDate()}, ${sunday.getFullYear()}`
    : `${fmt(monday, { month: "short", day: "numeric" })} – ${fmt(sunday, { month: "short", day: "numeric", year: "numeric" })}`;

  const isThisWeek = days.some((d) => dateKey(d) === today);
  const count = days.reduce((n, d) => n + eventsOn(dateKey(d)).length, 0);
  const nav = toolbar({
    title,
    subtitle: `${count} schedule${count === 1 ? "" : "s"}`,
    prev: { href: `#/weekly/${dateKey(addDays(monday, -7))}`, title: "Previous week" },
    next: { href: `#/weekly/${dateKey(addDays(monday, 7))}`, title: "Next week" },
    actions: [
      !isThisWeek && el("a", { class: "pill-btn", href: "#/weekly" }, "This week"),
      el("button", { class: "primary", onclick: () => openEventDialog(null, { date: isThisWeek ? today : dateKey(monday) }) }, "+ Add schedule"),
    ],
  });

  const head = el("div", { class: "wk-head" },
    el("span"),
    days.map((d) => el("a", { class: "wk-day" + (dateKey(d) === today ? " today" : ""), href: `#/daily/${dateKey(d)}`, title: "Open this day" },
      el("span", {}, fmt(d, { weekday: "short" })),
      el("strong", {}, d.getDate()),
    )),
  );

  const height = (WEEK_END_HOUR - WEEK_START_HOUR) * HOUR_PX;
  const times = el("div", { class: "wk-times", style: { height: `${height}px` } });
  for (let h = WEEK_START_HOUR + 1; h < WEEK_END_HOUR; h++) {
    times.append(el("span", { style: { top: `${(h - WEEK_START_HOUR) * HOUR_PX}px` } }, `${pad(h)}:00`));
  }

  const columns = days.map((d) => {
    const k = dateKey(d);
    const col = el("div", {
      class: "wk-col" + (k === today ? " today" : ""),
      style: { height: `${height}px` },
      title: "Click to add a schedule",
      onclick: (e) => {
        if (e.target !== col) return;
        const hour = Math.min(WEEK_END_HOUR - 1, WEEK_START_HOUR + Math.floor(e.offsetY / HOUR_PX));
        openEventDialog(null, { date: k, start: `${pad(hour)}:00`, end: hour >= 23 ? "23:59" : `${pad(hour + 1)}:00` });
      },
    });
    for (const { ev, lane, lanes } of layoutLanes(eventsOn(k))) {
      const start = Math.max(toMinutes(ev.start), WEEK_START_HOUR * 60);
      const end = Math.max(start + 20, Math.min(toMinutes(ev.end), WEEK_END_HOUR * 60));
      col.append(el("button", {
        class: "wk-event",
        title: `${ev.title} · ${ev.start}–${ev.end}`,
        style: {
          top: `${((start - WEEK_START_HOUR * 60) / 60) * HOUR_PX}px`,
          height: `${((end - start) / 60) * HOUR_PX - 2}px`,
          left: `calc(${(lane / lanes) * 100}% + 2px)`,
          width: `calc(${100 / lanes}% - 4px)`,
          "--c": findById(EVENT_TYPES, ev.type).color,
        },
        onclick: () => openEventDialog(ev),
      }, el("strong", {}, ev.title), el("span", {}, `${ev.start}–${ev.end}`)));
    }
    // Calendar-style red line at the current time.
    if (k === today) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      if (minutes >= WEEK_START_HOUR * 60) {
        col.append(el("span", { class: "now-line", style: { top: `${((minutes - WEEK_START_HOUR * 60) / 60) * HOUR_PX}px` } }));
      }
    }
    return col;
  });

  view.append(
    nav,
    el("div", { class: "card" },
      el("div", { class: "wk-scroll" },
        el("div", { class: "wk" }, head, el("div", { class: "wk-body" }, times, columns)),
      ),
      typeLegend(),
    ),
  );
}

// Put overlapping events side by side. Events are grouped into clusters that overlap in time;
// each event gets a lane within its cluster, and the cluster's lane count sets the width.
// Expects events sorted by start time.
function layoutLanes(events) {
  const result = [];
  let cluster = [];
  let laneEnds = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const p of cluster) result.push({ ...p, lanes: laneEnds.length });
    cluster = [];
    laneEnds = [];
  };
  for (const ev of events) {
    const start = toMinutes(ev.start);
    if (start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = toMinutes(ev.end);
    clusterEnd = Math.max(start >= clusterEnd ? 0 : clusterEnd, toMinutes(ev.end));
    cluster.push({ ev, lane });
  }
  flush();
  return result;
}

function typeLegend() {
  return el("div", { class: "legend" },
    EVENT_TYPES.map((t) => el("span", {}, el("i", { style: { background: t.color } }), t.name)),
    el("span", { class: "legend-hint" }, "Click an empty slot to add · click a schedule to edit"),
  );
}
