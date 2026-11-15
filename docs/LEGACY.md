# Econova

Uzbek-language economics game prototype for a first school. Run with Node.js 24:

```sh
npm start
```

The development server listens on port 3000 (`PORT` can override it). No package installation is required. Run `npm test` for the deterministic economy rules.

## Play

Use the profile button at the bottom of the sidebar to name yourself and your business. Everyone starts with 1,000,000 virtual so‘m. Buy supplies in the marketplace, set a price in your business, and save a weekly decision. Stock is reserved on submission; cancel the decision before the deadline to change it. A result preview explains the formula without changing balances. Decisions close Sunday at 18:00 Tashkent; results settle on the first visit after the deadline. Unsold stock returns to inventory. Savings, borrowing, lessons, a mystery, and milestones are available in the other town buildings.

## Prototype boundaries

All progress is stored in this browser’s localStorage, not a secure school database. This is not suitable for official competitive results: client clocks and browser data can be modified. The weekly scenario repeats; episode settlement runs on visits rather than a background scheduler. The adviser gives contextual scripted responses, not remote AI. Classmate counts are labeled sample data; shared rankings and authentication are not connected. A production release needs authenticated school accounts, server-side balances and deadline scheduling, moderated AI, and shared standings. No real money is involved.

Google Fonts are optional; the interface has local sans-serif fallbacks. Keep using the existing checkout; tasks are already isolated and do not need a new worktree.
