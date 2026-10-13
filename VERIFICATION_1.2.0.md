# Release 1.2.0 verification — 11 October 2026

## Completed checks

- TypeScript (`tsc --noEmit`): passed, including new release-test source.
- Windows x64 NSIS installer (`electron-builder`): packaging completed successfully.
- Production Vite and Electron bundles (`npm run build`): passed. Vite reported non-blocking Zod comment-annotation warnings.
- Vitest (`npm test`): 15 tests passed across four files, covering money calculations, authorization, idempotent checkout, receipt escaping, catalog data, catalog migration, SQLite transactions, restart recovery and backups.
- Playwright (`npx playwright test --config=playwright.release.config.ts`): one integrated real-browser/desktop release scenario passed against an isolated temporary database and port 18737.

The release scenario verified initial administrator setup through the browser, a separate desktop session, a real browser sale visible in the desktop database, two durable failed jobs when no printers were assigned, bill/KOT previews, price-free kitchen output, availability toggles, order details, report totals, saved settings, administrator/cashier permissions, independent browser sign-out, untrusted-Origin rejection, page rendering at 1920×1080, 1024×600 and 390×844, and saved-order recovery after restarting Electron. The browser reported no page errors. Screenshots were written under `test-results/`; desktop and mobile billing screenshots were visually inspected.

The first integration attempt timed out during restart with an Electron error dialog. Database cleanup was made idempotent to avoid closing SQLite twice during shutdown. The complete integration scenario then passed, including restart.

Windows sandbox restrictions initially blocked Vitest and Vite `realpath` reads. Re-running with approved host access succeeded. Test data stayed in temporary `cw-release-*` directories; the installed POS database was not modified.

## Scope limits

- Physical receipt printers, cutters, paper-out recovery, and actual 58/80 mm paper output were not tested.
- The installer is not automatically installed on the client POS. Back up the existing database before installation.
- Old browser-demo Playwright scenarios were not run; they target the removed mock backend and obsolete UI. The new release suite exercises the real backend instead.
- Parallel high-volume counter load and long historical datasets were not load-tested.
- Browser access is same-machine loopback only. The desktop app must remain running.
- Unfinished carts are still memory-only; saved orders are durable in SQLite.

## Installation handoff

Use `release/Chef Warriors POS Setup 1.2.0.exe`, and compare its SHA256 with `release/SHA256-1.2.0.txt`. Export a backup, close the existing app, and install over the existing location using the same Windows account. Open the updated desktop POS, then visit `http://127.0.0.1:17373` on that machine and sign in with existing local credentials. Confirm the real menu, historical orders and printer assignments before live billing.

Installer artifact: 111,750,755 bytes. Source and delivered installer SHA256 hashes match. Authenticode status: NotSigned. SHA256 is recorded in release/SHA256-1.2.0.txt. The installer was not executed on the client POS.
