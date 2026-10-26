// Routing, tabs, the shared schedule dialog, and import/export.
const view = document.getElementById("view");
const PAGES = ["daily", "weekly", "monthly", "overview"];

// Routes: #/daily/YYYY-MM-DD, #/weekly/YYYY-MM-DD, #/monthly/YYYY-MM, #/overview
function render() {
  const [, rawPage, arg = ""] = location.hash.split("/");
  const page = PAGES.includes(rawPage) ? rawPage : "daily";
  const dayArg = /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : todayKey();
  view.replaceChildren();
  view.className = `view view-${page}`;
  for (const a of document.querySelectorAll("#tabs a")) a.classList.toggle("active", a.dataset.page === page);
  if (page === "daily") renderDaily(view, dayArg);
  else if (page === "weekly") renderWeekly(view, dayArg);
  else if (page === "monthly") renderMonthly(view, /^\d{4}-\d{2}$/.test(arg) ? arg : todayKey().slice(0, 7));
  else renderOverview(view);
}

// Jump to the top when moving to another page or date, but not on in-page re-renders.
// Jump to the top when moving to another page or date, but not on in-page re-renders.
window.addEventListener("hashchange", () => {
  render();
  window.scrollTo(0, 0);
});

// --- Schedule dialog (used by weekly, monthly and overview) ---
const dialog = document.getElementById("event-dialog");
const form = document.getElementById("event-form");
const field = (name) => form.elements.namedItem(name);
let editingId = null;

document.getElementById("event-types").append(
  ...EVENT_TYPES.map((t) => el("label", {},
    el("input", { type: "radio", name: "type", value: t.id }),
    el("i", { style: { background: t.color } }),
    t.name,
  )),
);

function openEventDialog(ev, defaults = {}) {
  editingId = ev ? ev.id : null;
  const v = ev || { title: "", date: todayKey(), start: "09:00", end: "10:00", type: "class", ...defaults };
  document.getElementById("event-dialog-title").textContent = ev ? "Edit schedule" : "Add schedule";
  field("title").value = v.title;
  field("date").value = v.date;
  field("start").value = v.start;
  field("end").value = v.end;
  field("type").value = v.type;
  document.getElementById("event-delete").hidden = !ev;
  dialog.showModal();
  field("title").focus();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const ev = {
    id: editingId || uid(),
    title: field("title").value.trim(),
    date: field("date").value,
    start: field("start").value,
    end: field("end").value,
    type: field("type").value || "personal",
  };
  if (!ev.title || !ev.date || !ev.start) return;
  // End must be after start; default to a one-hour block.
  if (!ev.end || toMinutes(ev.end) <= toMinutes(ev.start)) {
    const end = Math.min(toMinutes(ev.start) + 60, 23 * 60 + 59);
    ev.end = `${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
  }
  data.events = data.events.filter((x) => x.id !== ev.id).concat(ev);
  saveData();
  dialog.close();
  render();
});

document.getElementById("event-delete").addEventListener("click", () => {
  data.events = data.events.filter((x) => x.id !== editingId);
  saveData();
  dialog.close();
  render();
});

document.getElementById("event-cancel").addEventListener("click", () => dialog.close());

// --- Backup ---
document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `life-tracker-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const status = document.getElementById("import-status");
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed.days || !Array.isArray(parsed.events)) throw new Error("not a backup");
    data = { ...defaultData(), ...parsed };
    saveData();
    render();
    status.textContent = "Imported.";
  } catch {
    status.textContent = "That file isn't a Life Tracker backup.";
  }
  setTimeout(() => (status.textContent = ""), 3000);
});

render();
