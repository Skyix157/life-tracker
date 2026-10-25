# Life Tracker

A small personal habit and daily check-in tracker. Plain HTML, CSS and JavaScript — no build step, no dependencies.

## Features

- **Habits:** add habits, tick them off for each of the last 7 days, and see your current streak.
- **Daily check-in:** log mood (1–5), hours of sleep and a short note for today.
- **Recent days:** the last two weeks of check-ins with how many habits you completed.
- **Export / import:** back up all your data as a JSON file and restore it later.

## Running it

Open `index.html` in a browser. That's it.

Data is stored in your browser's `localStorage`, so it stays on that device and browser. Use **Export data** regularly to keep a backup.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout |
| `style.css` | Styling (light and dark mode) |
| `app.js` | All app logic and storage |
