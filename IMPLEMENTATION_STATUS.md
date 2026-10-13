# Implementation status

## Current release 1.2.0

Real same-machine browser billing, updated POS pages and production-only runtime are implemented. TypeScript and production builds passed; 15 unit/database tests and an isolated Electron/browser release scenario passed. A duplicate-shutdown database-close issue found during restart verification was fixed and the full release scenario then passed. See [VERIFICATION_1.2.0.md](VERIFICATION_1.2.0.md) and [BROWSER_ACCESS.md](BROWSER_ACCESS.md).

## Previous release 1.1.1

Client menu and branding are implemented: 76 entries, 17 categories, exact printed prices, bucket/portion details and required combo choices. The billing screen is optimized for fast cashier use, with the existing theme and logo retained. Existing desktop data is backed up before its one-time import; accounts and historical sales are retained. See [MENU_IMPORT.md](MENU_IMPORT.md), [CHANGELOG.md](CHANGELOG.md), [VERIFICATION_1.1.0.md](VERIFICATION_1.1.0.md) and [VERIFICATION_1.1.1.md](VERIFICATION_1.1.1.md).

## Original 1.0.0 implementation record

Updated 11 October 2026. This is an implemented local application and provisional Windows x64 build, not client deployment acceptance.

| Work package | Implementation | Verification |
|---|---|---|
| 1 Foundation and layout | React/TypeScript/Vite/Tailwind, service interfaces, 24 products, navigation, dark reference design | Build and browser walkthroughs at 1024×768 and 1366×768 |
| 2 Billing and previews | Integer paise, notes, token/table, payment, snapshots, idempotent checkout, 58/80mm rendering | Calculation, empty/invalid input, duplicate key and price-free KOT tests |
| 3 Management/history/reports | Menu/category edits, availability, history, roles, cancellations, reports, CSV, settings | Browser management flow and unit reconciliation/permission checks |
| 4 Demo reliability | Labelled browser persistence, reset, simulated failures/unknown, individual retry and reviewed copies | Failure retry, price snapshot, cancellation and permission tests |
| 5 Desktop/persistence | Isolated preload, validated IPC, local scrypt accounts, SQLite transactions and constraints | Real Electron login/save/restart and denied cashier IPC changes |
| 6 Printing | Enumeration, explicit assignments, test documents, durable attempts, recovery to unknown, reviewed reprints | Missing-device failure and domain recovery tests; physical devices NOT RUN |
| 7 Backup/installation | SQLite backup API, validated restore/safety backup, startup retention, NSIS installer | SQLite restore into separate file and restart tests; provisional installer built |
| 8 Handover | Source, lockfile, build output, installer, operator/recovery guides, evidence | Hardware and client sign-off pending |

## Test evidence

- `npm test`: **11 tests passed** (10 domain tests and 1 SQLite integration scenario).
- `npm run build`: TypeScript, Vite and Electron main/preload bundling passed. Rollup reported harmless dependency annotation warnings from Zod.
- Browser walkthroughs: **3 passed**: 1366×768 billing/reload/history, 1024×768 billing/reload/history, management/failure/cancellation/role workflow. Screenshots were inspected; a grid compression defect found during visual QA was corrected. Checkout visibility is asserted in the management test.
- Electron integration: **passed on diagnostic retry** after an initial launch timeout under parallel load. Verified context isolation (no renderer `require`), first-admin setup, cashier creation, SQLite order save, two failed jobs for unassigned printers, restart persistence, denied cashier settings changes and rejected demo role switching. Tests now use one worker to reduce startup contention.
- Package build: NSIS Windows x64 completed in a local temp build directory after OneDrive blocked an intermediate rename. Authenticode status is **NotSigned**. The final installer is copied to `release/` with a SHA256 checksum.

## Acceptance matrix

| Test | Actual result |
|---|---|
| Integer totals, discount/tax/rounding | PASS |
| Empty cart, bad quantities, cash underpayment | PASS |
| Duplicate request / one sale / two originals | PASS in domain and SQLite |
| Price/receipt snapshots | PASS |
| Matching reference and price-free KOT | PASS |
| Failed kitchen job retry without another sale | PASS in demo/domain |
| Interrupted submission becomes unknown | PASS in SQLite restart |
| Reprint reason/copy audit | PASS domain; generated copy marker implemented |
| Cancellation/payment report reconciliation | PASS |
| Cashier denied privileged operations | PASS engine and Electron IPC |
| Consistent backup / separate-file recovery | PASS |
| Desktop restart retains order | PASS |
| Actual disconnected-network cold startup | NOT RUN; packaged UI uses local files and no remote assets |
| Two physical printers / cutter / paper-out / driver mapping | NOT RUN; device models absent |
| Actual 58mm/80mm paper layout | NOT RUN; HTML dimensions implemented |
| Installer execution on client's POS | NOT RUN |
| Previous released installer upgrade/rollback | NOT RUN; no prior release or confirmed target |

## Material limits

- This is a first release requiring actual-machine acceptance. Do not treat the provisional installer as client-approved production deployment.
- Browser demo storage is not a backup and role switching is not authentication. Desktop UPI/card recording does not verify payment externally.
- Prepaid cancellations require direct kitchen communication; postpaid incremental/cancellation KOT workflow is outside scope.
- Version 1 schema only. Future schema-changing updates need migration-specific pre-upgrade backup code and tests before release.
- Credentials cannot be recovered with a default password. See the authorized offline backup recovery procedure; a self-service password recovery system is not implemented.
- Browser storage corruption currently reports an error; if the app cannot load Settings, clear only the `chefwarriors-demo-v1` localStorage key via browser site-data tools. Desktop live data must never be cleared this way.
- A large historical dataset has not been load-tested; SQLite state transitions currently load complete order/job history and reserialize it within transactions. Validate scale before high-volume deployment.
- Food images are local crops of the supplied reference; extended sample items reuse those images. Replace them with approved product assets.

## Client decisions

Exact POS model/OS/CPU and installation permission; printer models/drivers/ports/paper widths; approved shop details and tax/rounding; prepaid workflow; backup device and retention; support contact and update owner. Inventory, loyalty, multi-branch sync and cloud integrations are not included.

Final serial verification: all 4 Playwright scenarios passed together (two browser sizes, Electron save/restart/IPC, management workflow). Final TypeScript and production build passed after the last source edits.

Checkout visibility fix (11 October 2026): Moved the total and Save & Print action outside the scrollable order details. Three regression scenarios passed at 1280×586, 1024×600 and 1366×768, checking actual viewport hit-testing with empty/full carts and completing checkout. Production source build passed. The existing NSIS installer predates this UI fix; browser development and newly built desktop assets include it.
