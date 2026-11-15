# P0 validation

Validation environment: Node.js 24.19.0 on Linux; Chromium 154.0.8037.57 through Playwright 1.65.1. Browser captures use 1440×960, 1280×900 and a 390×844 touch viewport. Three independent browser contexts represent Aziza, Bekzod and Camila. Every test run uses a separate temporary database.

## Automated results

- `npm test`: 32 passing tests (four retained prototype-rule checks, 24 P0 domain/database checks and four HTTP/concurrency checks).
- `npm run test:browser`: complete P0 acceptance flow passes through the actual UI. There are no uncaught browser page errors.
- JavaScript syntax checks and Git whitespace checks pass.

The tested sequence forms one company with 6m/4m contributions and 60/40 ownership, equips the workshop, hires a manager and two mechanics, buys six parts kits, takes six bookings, rents a temporary lift, completes all six jobs and sells the company for 12m with both signatures. The sellers receive 7.2m/4.8m; the buyer's wallet becomes 3m and the company's 9.4m cash remains with the same company ID.

Domain and HTTP checks cover escrow refunds and expiry, insufficient funds with full rollback, stale versions, exact shares and payouts, duplicate acceptance and acquisition requests, competing parcel claims and simultaneous closes, owner-only access, old-owner revocation, fixed booking prices, zero stock and customer budget constraints, deferred jobs, payroll, immutable balanced journals, session persistence, startup without duplicate grants, and scheduled work after browser closure or server restart. Existing pending work continues under the new owner after a sale.

Browser checks cover actual 3D building selection, 180° camera rotation, shared updates, persisted login and ownership after refresh, phone viewport width, panel scrolling without camera movement, low graphics, reduced motion, an independent laboratory calculation, and the accessible location list when WebGL is unavailable.

Screenshots:

- [Street, front view](screenshots/street-front.png)
- [Street, rear view](screenshots/street-back.png)
- [Company report](screenshots/workshop-report.png)
- [Phone, street](screenshots/mobile-street.png)
- [Phone, acquisition disclosure](screenshots/mobile-sale.png)

The test runner regenerates all images and the detailed JSON report under `test-results/`. That directory is ignored by Git. The images under `docs/screenshots/` are copies from the reviewed run.

## Limits of the evidence

These are browser and local-server checks, not real-device Telegram tests. Chrome's software renderer reports GPU readback stalls during screenshots. The renderer is capped at 30 redraws per second and pauses rendering when the camera and scene are idle; an idle redraw rate is not a device performance benchmark. Real phone FPS, battery impact, Telegram safe-area/back behavior, production roster authentication and load at 30 participants/2,000 residents have not been measured.

The Windows launcher has been reviewed but not executed on Windows in this Linux environment. Its underlying install/start commands are exercised here. Actual shared play is verified across isolated browser sessions connected to one running server; no public multiplayer deployment has been made. Generic bank lending, a second subcontractor company, general resident demand and the later 35-industry catalog are outside this first implementation.
