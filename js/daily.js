// Daily page, laid out like the bullet-journal spread:
// matrix + tasks top left, a 10-minute timeline on the right,
// 3 gratitudes + news bottom left, routines bottom right.
let paintCategory = "study";
let stopPainting = null;
document.addEventListener("pointerup", () => stopPainting && stopPainting());

function renderDaily(view, key) {
  const date = parseKey(key);
  const day = getDay(key);
  const isToday = key === todayKey();
  view.append(
    toolbar({
      title: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
      subtitle: isToday ? `Today · ${date.getFullYear()}` : String(date.getFullYear()),
      prev: { href: `#/daily/${dateKey(addDays(date, -1))}`, title: "Previous day" },
      next: { href: `#/daily/${dateKey(addDays(date, 1))}`, title: "Next day" },
      actions: [
        !isToday && el("a", { class: "pill-btn", href: "#/daily" }, "Today"),
        el("input", {
          class: "pill-btn",
          type: "date",
          value: key,
          "aria-label": "Go to date",
          onchange: (e) => e.target.value && (location.hash = `#/daily/${e.target.value}`),
        }),
      ],
    }),
    el("div", { class: "paper" },
      el("section", { class: "d-main" }, matrixSection(day), taskSection(day, key)),
      timelineSection(day),
      notesSection(day),
      routineSection(day),
    ),
  );
}

function sectionHeader(title, ...extra) {
  return el("div", { class: "section-head" }, el("h3", {}, title), extra);
}

function matrixSection(day) {
  const totals = timelineTotals(day);
  const moodButtons = [1, 2, 3, 4, 5].map((v) => {
    const btn = el("button", {
      class: "mood-btn" + (day.mood === v ? " selected" : ""),
      title: MOOD_LABELS[v],
      "aria-label": MOOD_LABELS[v],
      onclick: () => {
        day.mood = day.mood === v ? null : v;
        saveData();
        render();
      },
    });
    btn.innerHTML = moodFace(v, 26);
    return btn;
  });
  return el("div", { class: "matrix" },
    sectionHeader("Daily Matrix"),
    el("div", { class: "group" },
      matrixRow(day, "sleep", "Sleep", totals.sleep),
      matrixRow(day, "study", "Deep study", totals.study),
      matrixRow(day, "exercise", "Exercise", totals.exercise),
      el("div", { class: "matrix-row" },
        el("span", { class: "m-label" }, "Mood"),
        el("span", { class: "mood-pick" }, moodButtons),
      ),
    ),
  );
}

function matrixRow(day, field, label, timelineMinutes) {
  const value = day.matrix[field];
  const hours = el("input", { class: "num", type: "number", min: 0, max: 24, placeholder: "0", "aria-label": `${label} hours`, value: value == null ? "" : Math.floor(value / 60), oninput: update });
  const mins = el("input", { class: "num", type: "number", min: 0, max: 59, placeholder: "00", "aria-label": `${label} minutes`, value: value == null ? "" : value % 60, oninput: update });
  function update() {
    day.matrix[field] = hours.value === "" && mins.value === "" ? null : (Number(hours.value) || 0) * 60 + (Number(mins.value) || 0);
    saveData();
  }
  return el("div", { class: "matrix-row" },
    el("span", { class: "m-label" }, label),
    timelineMinutes > 0 && timelineMinutes !== value && el("button", {
      class: "hint",
      title: "Use the total from your timeline",
      onclick: () => {
        day.matrix[field] = timelineMinutes;
        saveData();
        render();
      },
    }, `Timeline ${fmtHM(timelineMinutes)}`),
    el("span", { class: "m-value" }, hours, el("span", { class: "unit" }, "h"), mins, el("span", { class: "unit" }, "m")),
  );
}

function taskSection(day, key) {
  const groups = [...new Set(day.tasks.map((t) => t.group))];
  const knownGroups = [...new Set(Object.values(data.days).flatMap((d) => d.tasks.map((t) => t.group)).filter(Boolean))];
  const groupInput = el("input", {
    class: "field group-input",
    list: "group-options",
    placeholder: "Group",
    "aria-label": "Task group",
    maxlength: 20,
    value: groups[groups.length - 1] || knownGroups[0] || "School",
  });
  const textInput = el("input", { id: "task-text", class: "field task-input", placeholder: "Add a task", "aria-label": "New task", maxlength: 120 });
  const carry = carryOverCandidates(day, key);
  const done = day.tasks.filter((t) => t.done).length;

  return el("div", { class: "tasks" },
    sectionHeader("Tasks", day.tasks.length > 0 && el("span", { class: "count" }, `${done} of ${day.tasks.length} done`)),
    groups.map((g) => el("div", { class: "task-group" },
      el("div", { class: "group-label" }, g || "Tasks"),
      el("ul", { class: "group" }, day.tasks.filter((t) => t.group === g).map((t) => taskItem(day, t))),
    )),
    el("form", {
      class: "add-task",
      onsubmit: (e) => {
        e.preventDefault();
        const text = textInput.value.trim();
        if (!text) return;
        day.tasks.push({ id: uid(), group: groupInput.value.trim(), text, done: false });
        saveData();
        render();
        document.getElementById("task-text")?.focus();
      },
    },
      groupInput,
      textInput,
      el("button", { class: "add-btn", type: "submit", title: "Add task", "aria-label": "Add task" }, "+"),
      el("datalist", { id: "group-options" }, knownGroups.map((g) => el("option", { value: g }))),
    ),
    carry && el("button", {
      class: "hint carry",
      onclick: () => {
        day.tasks.push(...carry.tasks.map((t) => ({ ...t, id: uid(), done: false })));
        saveData();
        render();
      },
    }, `Bring over ${carry.tasks.length} unfinished from ${carry.label}`),
  );
}

// Unfinished tasks from the most recent earlier day (within a week) that aren't already on this day.
function carryOverCandidates(day, key) {
  const date = parseKey(key);
  for (let i = 1; i <= 7; i++) {
    const prevDate = addDays(date, -i);
    const prev = data.days[dateKey(prevDate)];
    if (!prev || !prev.tasks.length) continue;
    const tasks = prev.tasks.filter((t) => !t.done && !day.tasks.some((x) => x.text === t.text && x.group === t.group));
    if (!tasks.length) return null;
    return { tasks, label: prevDate.toLocaleDateString(undefined, { weekday: "long" }) };
  }
  return null;
}

function taskItem(day, task) {
  const li = el("li", { class: "task" + (task.done ? " done" : "") },
    el("label", { class: "task-check" },
      el("input", {
        type: "checkbox",
        checked: task.done,
        onchange: (e) => {
          task.done = e.target.checked;
          li.classList.toggle("done", task.done);
          saveData();
        },
      }),
      el("span", { class: "task-text" }, task.text),
    ),
    el("button", {
      class: "del",
      title: "Delete task",
      "aria-label": `Delete ${task.text}`,
      onclick: () => {
        day.tasks = day.tasks.filter((t) => t !== task);
        saveData();
        render();
      },
    }, "×"),
  );
  return li;
}

function slotTime(i) {
  const minutes = TIMELINE_START * 60 + i * 10;
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}

function colorSlot(slot, cat) {
  slot.style.background = cat ? findById(CATEGORIES, cat).color : "";
}

function timelineSection(day) {
  const grid = el("div", { class: "timeline-grid" });
  for (let h = TIMELINE_START; h <= TIMELINE_END; h++) {
    const row = el("div", { class: "tl-row" }, el("span", { class: "tl-hour" }, h));
    for (let k = 0; k < SLOTS_PER_HOUR; k++) {
      const i = (h - TIMELINE_START) * SLOTS_PER_HOUR + k;
      const slot = el("span", { class: "slot", "data-i": i, title: slotTime(i) });
      colorSlot(slot, day.timeline[i]);
      row.append(slot);
    }
    grid.append(row);
  }

  // Press on a slot to paint it with the chosen color (or clear it if it already has that color), then drag.
  let mode = null;
  const apply = (slot) => {
    const i = slot.dataset.i;
    if (mode) day.timeline[i] = mode;
    else delete day.timeline[i];
    colorSlot(slot, mode);
  };
  grid.addEventListener("pointerdown", (e) => {
    const slot = e.target.closest(".slot");
    if (!slot) return;
    e.preventDefault();
    mode = paintCategory === "erase" || day.timeline[slot.dataset.i] === paintCategory ? null : paintCategory;
    apply(slot);
    stopPainting = () => {
      stopPainting = null;
      saveData();
      render();
    };
  });
  grid.addEventListener("pointermove", (e) => {
    if (!stopPainting) return;
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest(".slot");
    if (slot && grid.contains(slot)) apply(slot);
  });

  const palette = el("div", { class: "palette" },
    [...CATEGORIES, { id: "erase", name: "Erase", color: "transparent" }].map((c) =>
      el("button", {
        class: "swatch-btn" + (paintCategory === c.id ? " active" : ""),
        onclick: (e) => {
          paintCategory = c.id;
          for (const b of palette.children) b.classList.toggle("active", b === e.currentTarget);
        },
      }, el("span", { class: "sw" + (c.id === "erase" ? " erase" : ""), style: { background: c.color } }), c.name),
    ),
  );

  const totals = timelineTotals(day);
  const used = CATEGORIES.filter((c) => totals[c.id]);
  return el("section", { class: "d-timeline" },
    sectionHeader("Timeline"),
    el("p", { class: "tl-help" }, "Pick a color, then tap or drag. Each box is 10 minutes."),
    palette,
    grid,
    used.length > 0 && el("div", { class: "tl-totals" },
      used.map((c) => el("span", {}, el("span", { class: "sw", style: { background: c.color } }), c.name, el("b", {}, fmtHM(totals[c.id])))),
    ),
  );
}

function notesSection(day) {
  return el("section", { class: "d-notes" },
    sectionHeader("3G", el("span", { class: "count" }, "Three things I'm grateful for")),
    el("div", { class: "group" },
      [0, 1, 2].map((n) => el("div", { class: "line" },
        el("span", { class: "line-num" }, n + 1),
        el("input", {
          class: "line-input",
          value: day.gratitude[n] || "",
          placeholder: "I'm grateful for…",
          "aria-label": `Gratitude ${n + 1}`,
          maxlength: 140,
          oninput: (e) => {
            day.gratitude[n] = e.target.value;
            saveData();
          },
        }),
      )),
    ),
    sectionHeader("News"),
    el("textarea", {
      class: "field lined",
      rows: 5,
      placeholder: "What happened today?",
      "aria-label": "News",
      value: day.news,
      oninput: (e) => {
        day.news = e.target.value;
        saveData();
      },
    }),
  );
}

function routineSection(day) {
  const parts = [
    { id: "morning", title: "Routine" },
    { id: "night", title: "Night" },
  ];
  return el("section", { class: "d-routine" },
    parts.map((part) => el("div", { class: "routine" },
      sectionHeader(part.title,
        el("button", {
          class: "edit-link",
          title: "Edit this checklist",
          onclick: () => {
            const next = prompt(`${part.title} items, separated by commas:`, data.settings.routines[part.id].join(", "));
            if (next == null) return;
            data.settings.routines[part.id] = next.split(",").map((s) => s.trim()).filter(Boolean);
            saveData();
            render();
          },
        }, "Edit"),
      ),
      el("div", { class: "group" },
        data.settings.routines[part.id].map((item) => el("label", { class: "check" },
          el("input", {
            type: "checkbox",
            checked: Boolean(day.routine[part.id][item]),
            onchange: (e) => {
              day.routine[part.id][item] = e.target.checked;
              saveData();
            },
          }),
          item,
        )),
      ),
    )),
  );
}
