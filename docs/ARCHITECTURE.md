# P0 architecture and invariants

The application keeps the existing Node runtime and plain browser modules. Three.js supplies real geometry and OrbitControls. There is no build step. `server.js` serves an explicit allowlist of public assets; repository metadata, the database and private modules cannot be fetched through the static handler.

`lib/store.js` owns SQLite, password hashing, opaque session tokens, immutable journal records and transactional account changes. `lib/game.js` owns authenticated commands, company state, founder reservation release, disclosure versions and settlement. `public/app.js` presents authorized views and submits intents. `public/city.js` renders state and never changes finances.

A command runs within `BEGIN IMMEDIATE`: deduplicate actor+command ID, compare current version, enforce authorization and business constraints, mutate journal and state, store the receipt, commit. SQLite serializes writes across connections. Retries return the original result before checking a now-stale version. Version conflict requires the player to review fresh state; it is not silently retried as a new decision. Pending network commands are kept per browser session and retried with the same identifier. The shared version is deliberately coarse for this one-street pilot.

Money uses safe integer whole so‘m with an input ceiling. Ownership uses basis points totaling 10,000. Founding ratios and sale payouts must be exactly representable; no hidden rounding creates money. Grants have an explicit external source. Contributions and acquisition payouts are balanced transfers and excluded from operating profit. Inventory and equipment recognition use explicit clearing accounts; consumption and depreciation reduce the corresponding asset accounts. All journal lines sum to zero and account balances reconcile to their complete history. This is a teaching ledger, not a full statutory accounting package.

Founder cash sits in a proposal escrow until both signatures are accepted. Cancellation and expiry return accepted contributions. Company setup, payroll, parts usage and sales affect company and household/supplier accounts, never arbitrary client-provided balances. One failed command rolls back all writes, including its receipt. Settlement commits a unique city/tick/rules boundary so a retry cannot duplicate payroll or revenue. Any unpaid obligations remain attached to the company.

An acquisition transfers ownership of the existing company ID. It does not reset the company, cash, debts, staff, stock, jobs, history or scheduled work. Both existing owners approve one disclosure. Commands affecting the business are frozen while that listing is open; scheduled settlement can continue and invalidates the listing. A purchase requires the same disclosure and price, sufficient buyer funds, and all signatures. A second close cannot pay again.

SSE events contain no private financial data, only a change notification. A client then fetches an authenticated view. Owners get company details; other players get the public business card. Buyers get the explicitly offered disclosure. Each player sees only their own wallet receipts. Expired/revoked sessions cannot fetch state even if an older SSE connection still receives public invalidations.

Local demo identity is intentionally separate from future verified school identity. The app has no production registration route, Telegram bot, public deployment, arbitrary balance editor or reset endpoint. The only built-in accounts are the three identified practice participants. Auth cookies are HttpOnly and SameSite=Strict; API requests reject cross-origin POSTs; body sizes and login attempts are bounded.

## Data retention and rollback

There was no previous shared database or account schema to migrate. Legacy browser storage is left alone. The SQLite schema is created additively; the city snapshot includes `rulesVersion`. Before future schema changes, stop the app and copy the entire `data/` directory, including WAL/SHM files if present; never copy a live database file alone without SQLite backup support. Restore that directory while the app is stopped. Keep the old project release alongside its matching database backup. Do not restore a snapshot created by a future incompatible rules version into an earlier release.

The P0 server uses a finite practice calendar. General calendars, quiet hours, background manager behavior, large-population matching and population growth are P1/P2 work. No off-browser background process survives a stopped server; reopening a browser is not what performs settlement.

## Art and dependencies

All models, signs, roads, trees, vehicle geometry and CSS in this repository are original procedural assets made for Econova. There are no downloaded model or texture assets. Three.js and Playwright versions and integrity hashes are in `package-lock.json`; the bundled Three.js MIT license and checksum manifest are in `public/vendor/`. Playwright is a development-only Apache-2.0 dependency. Playing the exported project does not require `node_modules` or npm. System fonts are used; no font request leaves the app. Realism and phone performance need further art and device validation.
