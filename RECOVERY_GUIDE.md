# Installation, printers and recovery

## Provisional installation

The installer target is Windows x64; this is not confirmation of the client's POS. Confirm OS/CPU, install permissions, two printer models, drivers/ports, 58/80 mm paper and the prepaid workflow. Android and locked POS terminals require a different platform adapter.

Build with `npm ci`, `npm run build`, then `npm run package` on Windows. Distribute the resulting NSIS `.exe`. No separate Node runtime is required at the restaurant. The installer is unsigned: verify the distributor and checksum and use the organization's approved installation process. Do not disable security controls.

Launch and create the local admin. Data is stored in Electron's per-user application-data folder (`%APPDATA%\chefwarriors-pos` in development; verify the effective application name for the packaged install), outside the program directory. Protect that Windows account and data directory with appropriate access permissions and disk protection.

## Printer setup

Install manufacturer-supported Windows drivers. In Settings, assign the exact installed counter and kitchen names. Separate devices are required unless the admin explicitly allows sharing. Save assignments, then send labelled counter and kitchen test prints. Select receipt width, verify long names/instructions and ensure no prices appear on the kitchen output. Test paper-out, unplugged devices and interrupted submission. Configure driver paper dimensions and cutter settings on the actual device.

## Backup and restore

Desktop export uses SQLite's backup API, not a blind live-file copy. Choose an external destination. Backups include local account hashes and business records; keep them protected. Startup retains the ten latest automatic startup backups. Pre-restore safety backups are retained separately and should be reviewed by the owner.

To restore, sign in as admin, finish pending print submissions, choose Restore backup and confirm the reason. Select a valid schema-version-1 SQLite backup. The app checks integrity, references, metadata and admin presence; creates a consistent safety backup; closes connections; replaces the database; and requests login with the restored credentials. Restored queued/submitting jobs become unknown to prevent duplicate cooking tickets. Review physical output before any copy.

Regularly test a copy of the backup in a separate isolated installation. Never test recovery by overwriting the sole live database.

## Lost administrator credentials

There is no embedded master password or network password-reset service. Prefer a known administrator account. If all credentials are lost, the authorized Windows administrator should close the app, preserve the complete current data directory, and recover a previously validated backup with known credentials into a separate installation first. After verifying records, follow the approved replacement procedure while the app is closed. This can lose records after the backup date; keep the original database for support reconciliation. If no usable credentials/backup exist, contact the software maintainer for an authorized offline recovery procedure; do not delete the live database to reset login.

## Update and rollback

Export and validate a backup before updating. Keep the old installer and current database backup together. The installer preserves user data on uninstall; never deliberately remove user data during an update. Version 1 startup makes a consistent backup of existing installations. Future schema updates must add pre-migration backup handling; this release refuses a database with a newer schema.

For rollback, stop the app, preserve the current data directory, reinstall the previous compatible installer and restore its validated compatible backup. Do not open a newer-schema database with older software. Installer-to-installer upgrade and rollback still require acceptance testing on the actual POS.

## Client sign-off still needed

Confirm legal shop details and calculation rules, operating workflow, actual machine, printers/ports, kitchen distance, backup device/retention, authorized administrators, update/support contact and receipt language. Run the acceptance checklist offline on that hardware before live use.
