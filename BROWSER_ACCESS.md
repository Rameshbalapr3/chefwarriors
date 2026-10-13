# Real local browser billing

The Electron desktop app owns the local SQLite database and printer queue. It now also serves the browser interface at **http://127.0.0.1:17373**. Browser and desktop requests pass through the same service handlers and use the same database, invoice sequence, menu and print jobs.

## Using the installed release

1. Install a release containing these changes. An older installer does not include this server.
2. Start Chef Warriors POS and keep the desktop app open; it can be minimized.
3. Open `http://127.0.0.1:17373` in a browser on that same POS machine.
4. Sign in using a local administrator or cashier account. A new database requires initial administrator setup. Existing accounts and orders are retained.
5. Configure printers in Settings before billing. Browser checkout submits to the same real customer and kitchen printers as desktop checkout.

Browser profiles have their own server-side sessions; tabs in one profile share their browser sign-in. Signing out of the desktop does not sign out the browser. Browser sessions expire after eight hours without requests and are lost when the server restarts. Active foreground pages refresh state every 15 seconds and when focused. Database restore invalidates both desktop and browser sign-ins.

Browser backup/restore controls direct the operator to the desktop app, where the existing native file dialogs, backup validation and safety backup remain available. Browser CSV exports remain available.

## Development

Vite's `/api/pos` proxy connects to `127.0.0.1:17373`. The updated unpackaged Electron process must be running as well; Vite alone does not provide a database. A packaged release accepts requests from its own local browser origin, not the Vite development origin.

Normal source rollout requires `npm run build` followed by `npm run desktop`; installer rollout uses the existing packaging workflow. Release 1.2.0 passed TypeScript checks, the production build, 15 unit/database tests, and an isolated Electron/browser integration check. See VERIFICATION_1.2.0.md for scope and remaining hardware checks.

## Scope and recovery

- The server binds to **127.0.0.1 only**. Other phones, tablets and computers cannot connect over Wi-Fi or the internet. LAN access is not implemented.
- HTTP requests require a trusted local Host and Origin, a custom request header, bounded JSON bodies, and an HTTP-only same-site session cookie. The UI does not store passwords or authentication tokens in browser storage.
- The service uses existing role checks and login throttling. Browser requests cannot open database export/restore dialogs, switch demo roles or reset live data.
- Demo storage keys are removed on application load. The client menu is retained; no demo admin or sample transactions are created.
- If the desktop app is closed, the browser shows connection errors. Reopen the updated desktop app and retry. A port conflict is reported by the desktop without disabling desktop billing.
- Saved orders live in SQLite, not browser storage. Unfinished carts are still held in memory and are not recovered after a browser reload.
- A dropped connection during checkout does not prove the sale failed. Check order history after reconnecting. Retrying an unchanged cart retains the original request key; do not create a new bill until the original outcome is known.
- Printer acceptance is not physical-output confirmation. Existing reviewed-copy controls still apply.

Browser sessions, a browser sale visible in desktop, role restrictions and restart persistence were checked against an isolated database. Physical printers, simultaneous-counter load, and installation on the client POS remain unverified.
