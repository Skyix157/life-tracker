// All data lives in localStorage under one key:
// { habits: [{ id, name, done: { "YYYY-MM-DD": true } }], logs: { "YYYY-MM-DD": { mood, sleep, notes } } }
const STORAGE_KEY = "life-tracker-v1";
const DAYS_SHOWN = 7;

let data = load();

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.habits)) return { habits: parsed.habits, logs: parsed.logs || {} };
  } catch {}
  return { habits: [], logs: {} };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Consecutive completed days ending today (or yesterday, so an unchecked today doesn't break it).
function streak(habit) {
  let count = 0;
  let i = habit.done[dateKey(daysAgo(0))] ? 0 : 1;
  while (habit.done[dateKey(daysAgo(i))]) {
    count++;
    i++;
  }
  return count;
}

function renderHabits() {
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => daysAgo(DAYS_SHOWN - 1 - i));

  const head = document.getElementById("habit-head");
  head.innerHTML = "<th>Habit</th>";
  for (const d of days) {
    const th = document.createElement("th");
    th.textContent = d.toLocaleDateString(undefined, { weekday: "short" }) + " " + d.getDate();
    head.appendChild(th);
  }
  head.insertAdjacentHTML("beforeend", "<th>Streak</th><th></th>");

  const body = document.getElementById("habit-body");
  body.innerHTML = "";
  for (const habit of data.habits) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = habit.name;
    tr.appendChild(name);

    for (const d of days) {
      const key = dateKey(d);
      const td = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = "day" + (habit.done[key] ? " done" : "");
      btn.textContent = habit.done[key] ? "✓" : "";
      btn.title = `${habit.name} on ${key}`;
      btn.onclick = () => {
        if (habit.done[key]) delete habit.done[key];
        else habit.done[key] = true;
        save();
        renderHabits();
      };
      td.appendChild(btn);
      tr.appendChild(td);
    }

    const s = document.createElement("td");
    s.className = "streak";
    s.textContent = `🔥 ${streak(habit)}`;
    tr.appendChild(s);

    const del = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "delete";
    delBtn.textContent = "✕";
    delBtn.title = `Remove ${habit.name}`;
    delBtn.onclick = () => {
      data.habits = data.habits.filter((h) => h.id !== habit.id);
      save();
      renderHabits();
    };
    del.appendChild(delBtn);
    tr.appendChild(del);

    body.appendChild(tr);
  }

  document.getElementById("habit-empty").hidden = data.habits.length > 0;
}

function renderLog() {
  const log = data.logs[dateKey(new Date())] || {};
  document.getElementById("mood").value = log.mood || "";
  document.getElementById("sleep").value = log.sleep ?? "";
  document.getElementById("notes").value = log.notes || "";
}

function renderHistory() {
  const list = document.getElementById("history");
  list.innerHTML = "";
  const keys = Object.keys(data.logs).sort().reverse().slice(0, 14);
  if (!keys.length) {
    list.innerHTML = '<li class="muted">Nothing logged yet.</li>';
    return;
  }
  for (const key of keys) {
    const log = data.logs[key];
    const habitsDone = data.habits.filter((h) => h.done[key]).length;
    const li = document.createElement("li");
    const parts = [`<strong>${key}</strong>`];
    if (log.mood) parts.push(`mood ${log.mood}/5`);
    if (log.sleep !== undefined && log.sleep !== "") parts.push(`${log.sleep}h sleep`);
    parts.push(`${habitsDone}/${data.habits.length} habits`);
    li.innerHTML = parts.join(" · ");
    if (log.notes) {
      const p = document.createElement("div");
      p.className = "muted";
      p.textContent = log.notes;
      li.appendChild(p);
    }
    list.appendChild(li);
  }
}

function render() {
  document.getElementById("today").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  renderHabits();
  renderLog();
  renderHistory();
}

document.getElementById("habit-form").onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById("habit-name");
  const name = input.value.trim();
  if (!name) return;
  data.habits.push({ id: Date.now().toString(36), name, done: {} });
  input.value = "";
  save();
  renderHabits();
};

document.getElementById("log-form").onsubmit = (e) => {
  e.preventDefault();
  const sleep = document.getElementById("sleep").value;
  data.logs[dateKey(new Date())] = {
    mood: document.getElementById("mood").value,
    sleep: sleep === "" ? "" : Number(sleep),
    notes: document.getElementById("notes").value.trim(),
  };
  save();
  renderHistory();
  const saved = document.getElementById("saved");
  saved.textContent = "Saved";
  setTimeout(() => (saved.textContent = ""), 1500);
};

document.getElementById("export").onclick = () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `life-tracker-${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

document.getElementById("import").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.habits)) throw new Error("missing habits");
    data = { habits: parsed.habits, logs: parsed.logs || {} };
    save();
    render();
  } catch (err) {
    alert("That file doesn't look like a Life Tracker export.");
  }
  e.target.value = "";
};

render();
