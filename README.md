# Life Tracker

A personal planner and habit tracker modeled on a bullet journal. Plain HTML, CSS and JavaScript — no build step, no dependencies.

**Live:** https://skyix157.github.io/life-tracker/

## Pages

- **Daily** — a journal spread on grid paper:
  - *Daily Matrix*: hours of sleep, deep study and exercise, plus a mood check-in. Totals from the timeline can be applied with one click.
  - *Tasks* grouped by subject (School, CS, …), with a button to bring over unfinished tasks from the previous day.
  - *Timeline* from 5 to 24, where each box is 10 minutes. Pick a color (deep study, class, exercise, sleep, …) and tap or drag to paint how you spent the day.
  - *[3G]* — three gratitudes, and *[News]* for notes on the day.
  - *Routine* and *Night* checklists (editable).
- **Weekly** — Monday–Sunday time grid with color-coded schedules (class, exam/deadline, study, work, health, personal). Click an empty spot to add one; click a block to edit or delete it.
- **Monthly** — calendar showing each day's schedules, mood and task progress. Click a day to open it.
- **Overview** — dashboard with routine consistency over two weeks, today's to-dos and upcoming schedules, focus time rings from the timeline, and the week's moods.

## Data

Everything is stored in your browser's `localStorage`, so it stays on that device and browser and is never uploaded. Use **Export backup** in the footer to save a JSON file, and **Import backup** to restore it or move it to another device.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell, tabs and the schedule dialog |
| `style.css` | All styling |
| `js/store.js` | Data model, storage and shared helpers |
| `js/daily.js` | Daily journal page |
| `js/weekly.js` | Weekly schedule grid |
| `js/monthly.js` | Monthly calendar |
| `js/overview.js` | Overview dashboard |
| `js/main.js` | Routing, schedule dialog, backup import/export |
