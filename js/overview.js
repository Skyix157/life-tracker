// Overview dashboard: routine consistency, to-dos, focus time and mood at a glance.
let routineTab = "morning";
let focusRange = "today";
let moodWeekOffset = 0;

function renderOverview(view) {
  view.append(
    el("div", { class: "ov-head" },
      el("span", { class: "ov-badge" }, el("span", { class: "icon" }, "✦"), "Overview"),
      el("h1", {}, "Your rhythm"),
    ),
    el("div", { class: "ov-grid" }, activityCard(), todoCard(), focusCard(), moodCard()),
  );
}

function ovCard(title, text, panelTitle, panelExtra, ...body) {
  return el("section", { class: "ov-card" },
    el("h3", {}, title),
    el("p", {}, text),
    el("div", { class: "ov-panel" },
      el("div", { class: "ov-panel-title" }, el("span", {}, panelTitle), panelExtra),
      body,
    ),
  );
}

const lastNDays = (n) => Array.from({ length: n }, (_, i) => addDays(new Date(), i - n + 1));

function activityCard() {
  const days = lastNDays(14);
  const items = data.settings.routines[routineTab];
  const tabs = el("div", { class: "seg" },
    [["morning", "Routine"], ["night", "Night"]].map(([id, label]) =>
      el("button", { class: routineTab === id ? "active" : "", onclick: () => { routineTab = id; render(); } }, label)),
  );
  const head = el("div", { class: "dots-row dots-head" },
    el("span"),
    days.map((d) => el("span", {}, d.getDate())),
  );
  const rows = items.map((item) => el("div", { class: "dots-row" },
    el("span", { class: "dots-label" }, item),
    days.map((d) => {
      const k = dateKey(d);
      const day = data.days[k];
      const state = !hasEntry(day) ? "none" : day.routine[routineTab][item] ? "done" : "missed";
      const label = { none: "Not logged", done: "Completed", missed: "Missed" }[state];
      return el("a", { class: `dot ${state}`, href: `#/daily/${k}`, title: `${item} · ${d.toLocaleDateString()} · ${label}` });
    }),
  ));
  return ovCard(
    "Activity Tracker",
    "Your routine checklists over the last two weeks. Consistency over perfection — every dot is a day.",
    "Routine Progress", null,
    el("div", { class: "ov-inner" },
      tabs,
      items.length ? [head, rows] : el("p", { class: "muted" }, "No routine items yet. Add some on the Daily page."),
      el("div", { class: "ov-legend" },
        el("span", {}, el("i", { class: "dot missed" }), "Missed"),
        el("span", {}, el("i", { class: "dot none" }), "Not logged"),
        el("span", {}, el("i", { class: "dot done" }), "Completed"),
      ),
    ),
  );
}

function todoCard() {
  const tk = todayKey();
  const day = getDay(tk);
  const tasks = [...day.tasks].sort((a, b) => a.done - b.done);
  const upcoming = Array.from({ length: 7 }, (_, i) => dateKey(addDays(new Date(), i))).flatMap(eventsOn);

  const taskItems = tasks.map((t) => el("div", { class: "todo-item" + (t.done ? " done" : "") },
    el("label", { class: "todo-title" },
      el("input", { type: "checkbox", checked: t.done, onchange: (e) => { t.done = e.target.checked; saveData(); render(); } }),
      t.text,
    ),
    el("div", { class: "chips" }, t.group && el("span", { class: "chip dark" }, t.group), el("span", { class: "chip soft" }, "Today")),
  ));
  const eventItems = upcoming.map((ev) => {
    const type = findById(EVENT_TYPES, ev.type);
    const when = ev.date === tk ? "Today" : parseKey(ev.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return el("button", { class: "todo-item event", onclick: () => openEventDialog(ev) },
      el("div", { class: "todo-title" }, el("i", { class: "sq", style: { background: type.color } }), ev.title),
      el("div", { class: "chips" }, el("span", { class: "chip", style: { background: type.color } }, type.name)),
      el("div", { class: "todo-meta" }, `🗓 ${when} · ${ev.start}–${ev.end}`),
    );
  });

  return ovCard(
    "To-Do List",
    "Today's tasks from your daily page and the schedules coming up this week.",
    "Timeline", el("a", { class: "panel-link", href: "#/daily" }, "Open today →"),
    el("div", { class: "todo-list" },
      taskItems.length || eventItems.length
        ? [taskItems, eventItems]
        : el("p", { class: "muted" }, "Nothing planned yet. Add tasks on the Daily page or schedules on the Weekly page."),
    ),
  );
}

function focusCard() {
  const keys = focusRange === "today"
    ? [todayKey()]
    : Array.from({ length: 7 }, (_, i) => dateKey(addDays(startOfWeek(new Date()), i)));
  const totals = {};
  for (const k of keys) {
    for (const [cat, mins] of Object.entries(timelineTotals(data.days[k]))) totals[cat] = (totals[cat] || 0) + mins;
  }
  // Show the three biggest categories; fall back to study/exercise/class when there's little data.
  const picked = CATEGORIES.filter((c) => totals[c.id]).sort((a, b) => totals[b.id] - totals[a.id]).slice(0, 3);
  for (const id of ["study", "exercise", "class"]) {
    if (picked.length < 3 && !picked.some((c) => c.id === id)) picked.push(findById(CATEGORIES, id));
  }

  const rings = picked.map((c) => {
    const mins = totals[c.id] || 0;
    const goal = CATEGORY_GOALS[c.id] * (focusRange === "today" ? 1 : 7);
    const r = 56;
    const circ = 2 * Math.PI * r;
    const frac = Math.min(1, mins / goal);
    const ring = el("div", { class: "ring" });
    ring.innerHTML =
      `<svg viewBox="0 0 130 130" aria-hidden="true"><circle cx="65" cy="65" r="${r}" fill="none" stroke="#d6d4cf" stroke-width="5"/>` +
      `<circle cx="65" cy="65" r="${r}" fill="none" stroke="${c.color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${frac * circ} ${circ}" transform="rotate(-90 65 65)"/></svg>`;
    ring.append(el("div", { class: "ring-text" },
      el("span", { class: "ring-time" }, `${pad(Math.floor(mins / 60))}:`, el("span", { style: { color: `color-mix(in srgb, ${c.color} 75%, #000)` } }, pad(mins % 60))),
      el("span", { class: "ring-name" }, c.name),
      el("span", { class: "ring-goal" }, `goal ${Math.round(goal / 60)}h`),
    ));
    return ring;
  });

  const range = el("div", { class: "seg small" },
    [["today", "Today"], ["week", "This week"]].map(([id, label]) =>
      el("button", { class: focusRange === id ? "active" : "", onclick: () => { focusRange = id; render(); } }, label)),
  );
  return ovCard(
    "Focus Sessions",
    "Time from your daily timeline, measured against a goal for each kind of block.",
    "Session List", range,
    el("div", { class: "ov-inner rings" }, rings),
  );
}

function moodCard() {
  const monday = addDays(startOfWeek(new Date()), moodWeekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const moods = days.map((d) => data.days[dateKey(d)]?.mood).filter(Boolean);
  const avg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

  const select = el("select", {
    class: "pill-select",
    onchange: (e) => { moodWeekOffset = Number(e.target.value); render(); },
  }, [[0, "This Week"], [-1, "Last Week"], [-2, "2 Weeks Ago"], [-3, "3 Weeks Ago"]].map(([v, label]) => {
    const opt = el("option", { value: v }, label);
    opt.selected = v === moodWeekOffset;
    return opt;
  }));

  const faces = days.map((d) => {
    const mood = data.days[dateKey(d)]?.mood;
    const face = el("span", { class: "face" });
    face.innerHTML = moodFace(mood, 46);
    return el("a", { class: "mood-day", href: `#/daily/${dateKey(d)}`, title: mood ? MOOD_LABELS[mood] : "No mood logged" },
      face, d.toLocaleDateString(undefined, { weekday: "short" }));
  });

  return ovCard(
    "Mood Logging",
    "Your daily mood check-ins. Notice patterns and what shapes how you feel.",
    "Journal", null,
    el("div", { class: "ov-inner" },
      select,
      el("div", { class: "mood-week" }, faces),
      el("p", { class: "mood-avg" }, avg ? `Average: ${MOOD_LABELS[Math.round(avg)]} (${avg.toFixed(1)} / 5) over ${moods.length} day${moods.length > 1 ? "s" : ""}` : "No moods logged this week."),
    ),
  );
}
