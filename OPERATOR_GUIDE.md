# Operator guide

## Start a shift

Launch Chef Warriors POS and sign in. First desktop launch requires creating an administrator (username 3–40 letters/digits/dot/underscore/hyphen; password 12–128 characters). Create cashier accounts under Settings. The browser demonstration instead has explicitly labelled role switching.

## Take an order

1. Filter a category or search a food name. Tap Add; use +/− or the remove button to change the cart.
2. Choose takeaway or dine-in and enter a token/table. Enter cooking instructions under each item.
3. Set a fixed rupee discount if required. Tax starts disabled and must be approved/configured by the client.
4. Select Cash, UPI or Card. For cash, a blank received amount means exact payment; entering more displays change. Underpayment is rejected. UPI/card are cashier records, not online payment verification.
5. Save & Print once. Desktop commits the order before dispatching both jobs. Browser demo creates previews only.
6. Check both print-job statuses. The customer bill includes prices and totals. The KOT contains only order details, items, quantities and instructions.

## Printing problems

Open Orders, then Bill or KOT. Failed jobs can be retried separately without another sale. Missing printer assignments must first be saved in Settings. Submitted means the spooler accepted the document; inspect the paper.

For unknown outcomes, check the physical printer before requesting a copy. An admin enters a reason. Copies are visibly marked REPRINT and retain the original invoice reference. Tell kitchen staff this is a copy, not another cooking instruction. Do not repeatedly click reprint for a paper jam.

## Management

Admins can add/edit products and categories, toggle availability, change settings and view reports. Historic bills retain their original prices. Orders can be cancelled only with a reason. Notify the kitchen directly; cancellation does not send another ticket in this prepaid release. Reports exclude cancellations from sales and show their total separately. Export CSV for the selected report date or all dates.

## End a shift

Review cancelled/uncertain jobs, reconcile cashier-recorded payments, and export a database backup to another device from desktop Settings. A file on the same disk cannot protect against disk failure. Follow the owner's approved backup retention and handover process.

## Client menu and combos (version 1.1.0)

The menu now contains the 76 entries from The Chef Warriors menu cards. One quantity is one listed portion or combo; piece counts appear in the item name or contents. Tap Choose for configurable combos, select every required rice/noodles or grill/BBQ choice, then Add to order. Different configurations of the same combo appear as separate cart lines. Their choices and contents are saved on the bill and kitchen ticket.

To update an existing installation, close Chef Warriors POS and run the latest installer using the same Windows account and installation choice. Keep the existing installation location. Reopen and sign in with your current credentials; the menu imports automatically once and a before-client-menu database backup is retained. Do not uninstall or delete the data folder to update the menu.
