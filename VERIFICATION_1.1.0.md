# Version 1.1.0 verification

11 October 2026. Client menu and branding update.

| Check | Result |
|---|---|
| TypeScript and production renderer/main/preload builds | PASS |
| Domain, catalogue and SQLite tests | 15 PASS |
| Menu coverage | 76 unique valid items, 17 categories; all 76 prices checked against a separately transcribed list |
| Existing database upgrade | PASS: safety backup contains previous menu; accounts, order snapshots, invoice sequence and printer configuration retained |
| Repeated launch | PASS: catalogue update runs only once and retains subsequent menu edits |
| Combo validation | PASS: missing/invalid choices rejected, rice/noodles variants retained separately, contents and choices on price-free KOT |
| Browser billing at 1366×768 and 1024×768 | 2 PASS |
| Checkout visibility at 1280×586, 1024×600 and 1366×768 | 3 PASS |
| Browser menu management, failed-job retry, cancellation and roles | PASS |
| Client branding, combo checkout and receipt/KOT | PASS after adding explicit accessible labels to combo selects |
| Electron login, SQLite save/restart and privileged IPC checks | PASS using a local staged copy of the production build |

23 automated test scenarios passed across the final applicable runs. They were not all executed in one uninterrupted successful run: the initial combo selector failed, was fixed, and passed on rerun; Electron tests encountered OneDrive file-loading failures/timeouts and passed after staging identical build files to a local temporary directory. The desktop test now stages the build automatically.

Visual review confirmed the supplied warrior logo, yellow/red/black identity, client food artwork, all category controls at the standard desktop width, separately configured combo lines and visible total/checkout controls. Category/product lists scroll on smaller windows. Food imagery is category artwork from the supplied cards, not a claim of separate photographs for every item.

Physical printers, actual paper/cutter output and installation acceptance on the client's POS remain NOT RUN. The installer is provisional Windows x64 and unsigned. The existing app identity and data location are preserved for upgrades. No user's live database or installed app was modified by these tests.

Before client rollout, verify unusual printed names with the owner if required: Lays Chicken, Fully Loaded Fried Chicken, Blue Curracao Mojito and Warrier Combo. These are retained from the menu card rather than corrected speculatively. The Veg Load combo's Mojito flavour is unspecified on the card and has not been invented.

NSIS packaging: completed on retry using the already-built app after the initial uninstaller-helper spawn failure. Final installer: release/Chef Warriors POS Setup 1.1.0.exe. SHA256 is recorded in release/SHA256-1.1.0.txt.
