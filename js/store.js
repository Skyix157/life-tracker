// Shared data, constants and small helpers used by every page.
// Everything is saved in localStorage under STORAGE_KEY.
const STORAGE_KEY = "life-tracker-v2";
const OLD_STORAGE_KEY = "life-tracker-v1";

// Colors for painting the daily timeline.
const CATEGORIES = [
  { id: "study", name: "Deep study", color: "#c7a2c0" },
  { id: "class", name: "Class", color: "#9db4e2" },
  { id: "exercise", name: "Exercise", color: "#e8954a" },
  { id: "sleep", name: "Sleep", color: "#8a8d96" },
  { id: "meal", name: "Meal", color: "#f0cf8f" },
  { id: "social", name: "Social", color: "#93cba8" },
  { id: "other", name: "Other", color: "#cfcac0" },
];

// Daily target in minutes for each category; fills the overview's focus rings.
const CATEGORY_GOALS = { study: 360, class: 300, exercise: 60, sleep: 480, meal: 90, social: 120, other: 120 };

// Color-coded types for weekly/monthly schedules.
const EVENT_TYPES = [
  { id: "class", name: "Class", color: "#9db4e2" },
  { id: "exam", name: "Exam / Deadline", color: "#ef8f78" },
  { id: "study", name: "Study", color: "#c7a2c0" },
  { id: "work", name: "Work", color: "#aab4c3" },
  { id: "health", name: "Health", color: "#93cba8" },
  { id: "personal", name: "Personal", color: "#f0cf8f" },
];

const MOOD_LABELS = ["", "Rough", "Meh", "Okay", "Good", "Great"];

// The daily timeline has one row per hour from TIMELINE_START to TIMELINE_END, split into 10-minute slots.
const TIMELINE_START = 5;
const TIMELINE_END = 24;
const SLOTS_PER_HOUR = 6;

let data = loadData();

function defaultData() {
  return {
    days: {},
    events: [],
    settings: { routines: { morning: ["Exercise", "Read", "Journal"], night: ["Exercise", "Read", "Journal"] } },
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.days) return { ...defaultData(), ...saved };
    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
    if (old && old.logs) return migrateV1(old);
  } catch {}
  return defaultData();
}

// The first version only had mood/sleep/notes check-ins; carry those over.
function migrateV1(old) {
  const migrated = defaultData();
  for (const [key, log] of Object.entries(old.logs)) {
    const day = blankDay();
    if (log.mood) day.mood = Number(log.mood);
    if (log.sleep !== "" && log.sleep != null) day.matrix.sleep = Math.round(Number(log.sleep) * 60);
    if (log.notes) day.news = log.notes;
    migrated.days[key] = day;
  }
  return migrated;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function blankDay() {
  return {
    matrix: { sleep: null, study: null, exercise: null }, // minutes
    mood: null, // 1–5
    tasks: [], // { id, group, text, done }
    timeline: {}, // slot index -> category id
    gratitude: ["", "", ""],
    news: "",
    routine: { morning: {}, night: {} }, // item name -> true
  };
}

function getDay(key) {
  if (!data.days[key]) data.days[key] = blankDay();
  return data.days[key];
}

// True when anything was actually recorded for the day.
function hasEntry(day) {
  if (!day) return false;
  return Boolean(
    day.mood ||
      day.tasks.length ||
      Object.keys(day.timeline).length ||
      day.gratitude.some(Boolean) ||
      day.news ||
      Object.values(day.matrix).some((v) => v != null) ||
      Object.values(day.routine.morning).some(Boolean) ||
      Object.values(day.routine.night).some(Boolean),
  );
}

// Minutes per category painted on the day's timeline.
function timelineTotals(day) {
  const totals = {};
  for (const cat of Object.values(day ? day.timeline : {})) totals[cat] = (totals[cat] || 0) + 10;
  return totals;
}

function eventsOn(key) {
  return data.events.filter((e) => e.date === key).sort((a, b) => a.start.localeCompare(b.start));
}

const findById = (list, id) => list.find((x) => x.id === id) || list[list.length - 1];

const pad = (n) => String(n).padStart(2, "0");

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const todayKey = () => dateKey(new Date());

function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Weeks start on Monday.
function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fmtHM(minutes) {
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Tiny DOM builder: el("div", { class: "x", onclick: fn }, child, [children], "text").
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "style") Object.assign(node.style, value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (key === "value" || key === "checked") node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

// SVG face for a 1–5 mood; an empty dashed circle when there's no mood.
function moodFace(value, size = 40) {
  const svg = (inner) => `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
  if (!value) return svg('<circle cx="20" cy="20" r="18" fill="none" stroke="#d3cfc7" stroke-width="2" stroke-dasharray="4 4"/>');
  const colors = { 1: "#d9782b", 2: "#e8954a", 3: "#f0cf8f", 4: "#d4b6cf", 5: "#c7a2c0" };
  const mouths = {
    1: "M13 29 Q20 22 27 29",
    2: "M12 27 Q14 24 16 27 Q18 30 20 27 Q22 24 24 27 Q26 30 28 27",
    3: "M13 26 L27 26",
    4: "M13 24 Q20 30 27 24",
    5: "M11 22 Q20 34 29 22",
  };
  return svg(
    `<circle cx="20" cy="20" r="19" fill="${colors[value]}"/>` +
      '<circle cx="14" cy="16" r="2.2" fill="#fff"/><circle cx="26" cy="16" r="2.2" fill="#fff"/>' +
      `<path d="${mouths[value]}" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}
