// Monthly page: calendar with schedules, mood and task progress for each day.
function renderMonthly(view, monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const gridStart = startOfWeek(first);
  const cellCount = Math.ceil((((first.getDay() + 6) % 7) + daysInMonth) / 7) * 7;
  const today = todayKey();
  const monthOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

  const isThisMonth = monthKey === today.slice(0, 7);
  const count = data.events.filter((e) => e.date.startsWith(monthKey)).length;
  const nav = toolbar({
    title: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    subtitle: `${count} schedule${count === 1 ? "" : "s"}`,
    prev: { href: `#/monthly/${monthOf(new Date(year, month - 2, 1))}`, title: "Previous month" },
    next: { href: `#/monthly/${monthOf(new Date(year, month, 1))}`, title: "Next month" },
    actions: [
      !isThisMonth && el("a", { class: "pill-btn", href: "#/monthly" }, "This month"),
      el("button", { class: "primary", onclick: () => openEventDialog(null, { date: isThisMonth ? today : `${monthKey}-01` }) }, "+ Add schedule"),
    ],
  });

  const dow = Array.from({ length: 7 }, (_, i) =>
    el("div", { class: "m-dow" }, addDays(gridStart, i).toLocaleDateString(undefined, { weekday: "short" })));

  const cells = Array.from({ length: cellCount }, (_, i) => {
    const d = addDays(gridStart, i);
    const k = dateKey(d);
    const day = data.days[k];
    const events = eventsOn(k);
    const done = day ? day.tasks.filter((t) => t.done).length : 0;
    const face = el("span", { class: "m-mood", title: day?.mood ? MOOD_LABELS[day.mood] : "" });
    if (day?.mood) face.innerHTML = moodFace(day.mood, 20);

    return el("div", {
      class: "m-cell" + (d.getMonth() !== month - 1 ? " out" : "") + (k === today ? " today" : ""),
      title: "Open this day",
      onclick: () => (location.hash = `#/daily/${k}`),
    },
      el("div", { class: "m-top" }, el("span", { class: "m-num" }, d.getDate()), face),
      events.slice(0, 3).map((ev) => el("button", {
        class: "m-pill",
        title: `${ev.title} · ${ev.start}–${ev.end}`,
        style: { "--c": findById(EVENT_TYPES, ev.type).color },
        onclick: (e) => {
          e.stopPropagation();
          openEventDialog(ev);
        },
      }, el("span", { class: "m-title" }, ev.title), el("span", { class: "m-time" }, ev.start))),
      events.length > 3 && el("span", { class: "m-more" }, `+${events.length - 3} more`),
      day && day.tasks.length > 0 && el("span", { class: "m-meta" }, `✓ ${done}/${day.tasks.length} tasks`),
    );
  });

  view.append(nav, el("div", { class: "card month-card" }, el("div", { class: "month" }, dow, cells), typeLegend()));
}
