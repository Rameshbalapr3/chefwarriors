# Chef Warriors restaurant POS

A local restaurant billing app based on the supplied development guide and The Chef Warriors client menu cards. React, TypeScript, Vite and Tailwind frontend; isolated Electron desktop shell; bundled Node SQLite. No hosted backend or paid service is required.

## Run

Use Node 24 LTS and npm on the development computer. The installed POS includes its runtime and does not require Node.

```powershell
npm ci
npm run dev
```

Browser billing uses the real desktop backend; demo mode has been removed. Keep the updated desktop POS running and open http://127.0.0.1:17373 on the same machine. Sign in with a real local staff account. For source development, Vite at http://127.0.0.1:5173 proxies `/api/pos` to an updated, unpackaged desktop process. See [BROWSER_ACCESS.md](BROWSER_ACCESS.md).

```powershell
npm run typecheck
npm test
npm run test:ui
npm run build
npm run desktop
npm run package
```

`test:ui` uses installed Microsoft Edge and includes an Electron integration test (run `npm run build` first). On first use Electron may download its pinned runtime. `package` targets provisional Windows x64 with an unsigned NSIS installer. Use a local non-OneDrive build folder if Windows prevents packaging directory renames. No publication or deployment is performed.

## Implemented workflow

- 76 client menu products, 17 categories, search, availability, whole quantities and per-item instructions.
- Prepaid dine-in/takeaway, table/token, fixed INR discount, optional exclusive tax after discount, configurable rounding, cash change and cashier-recorded card/UPI.
- Save once with a unique request key; immutable product, price and shop snapshots; paired customer bill and price-free kitchen ticket with the same invoice reference.
- Menu/category management, history, admin cancellation with reason, sales/payment/item reports excluding cancelled orders, safe CSV export.
- Real printer submissions, separate failed-job retries, and reviewed/audited reprint copies.
- Desktop local account setup, scrypt hashes, admin/cashier service checks, SQLite transactions, durable jobs, interrupted-submission recovery, explicit installed printer selection.
- Consistent SQLite export, validated restore with a safety backup, dated startup backup retention, installer configuration.

## Source map

`src/domain`: pure money, receipt and reporting logic. `src/application`: authorized state transitions. `src/contracts`: typed service interfaces and result types. `src/adapters/browser`: authenticated local HTTP adapter. `desktop/browser-server.ts`: loopback HTTP server and browser sessions. `src/ui`: React UI. `desktop/database`: SQLite and local credentials. `desktop/printing`: Electron spooler adapter. `desktop/preload.ts`: narrow IPC bridge. `desktop/main.ts`: desktop service boundary. `tests`: business, storage, browser and Electron tests.

Version 1.1.0 applies The Chef Warriors branding and imports the supplied client menu on upgrade. Version 1.1.1 simplifies the cashier billing flow while keeping the same theme and logo. See [MENU_IMPORT.md](MENU_IMPORT.md) for every item, price, combo option and data-preservation behaviour.

The initial standalone `billing.js`, `billing.test.js` and `server.js` files were preserved; they are not used by the new app. `assets/client-menu-1.png` through `client-menu-4.png` retain the supplied client cards. The UI uses their logo and category artwork locally; no unrelated sample food images are displayed.

Read [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification and remaining acceptance gates, [OPERATOR_GUIDE.md](OPERATOR_GUIDE.md) for daily use and [RECOVERY_GUIDE.md](RECOVERY_GUIDE.md) for installation, printer setup and recovery.
