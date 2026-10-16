# Kilo (Recycling Collection App)

Brand: **Kilo**, "Every kilo counts". Logo in `components/Logo.tsx` (scale weight with a cut-out k); app icon `app/icon.svg`.

Product spec: `Docs/README.md`. UI references: `Docs/Admin UI.png` (admin, dark) and `Docs/Mobile UI.png` (customer, light).

## Commands
- `npm run dev` · `npm run build` (static export to `out/`) · `npm test` (vitest) · `npm run lint` (tsc)

## Hosting
- GitHub Pages via `.github/workflows/deploy-pages.yml` (push to `main`). Static export only: no server code,
  no dynamic route segments. Detail pages take query params (`/admin/runs/view?id=`, `/driver/run?id=`).
- `PAGES_BASE_PATH` sets the base path; links via `next/link`/router get it automatically, raw URLs
  (manifest, service worker) must use `process.env.NEXT_PUBLIC_BASE_PATH`.

## Hard rules
- **UI code never accesses storage directly.** Screens call `api.*` from `@/lib/data` (interface in `lib/data/api.ts`).
  `lib/data/mock.ts` is the localStorage implementation; Supabase will be a second implementation of the same interface.
- **Logic is pure and tested.** Entry maths, the active-customer rule, schedules and winner selection live in `lib/logic/*`
  with tests in `tests/`. Change a rule → change the test first.
- **Roles are gated twice:** route areas wrap pages in `<RoleGate role=…>` and every api function calls `requireRole`.
  Customer/driver functions are scoped to the current user. Dev role switcher: `components/DevSwitcher.tsx`.
- The draw runs in the browser for development only. It must move server-side with Supabase.

## Rules (source of truth, keep in sync with `/rules` page and tests)
- Collection is **weekly only**. Customers start or stop a weekly pickup and can skip a week up to the day before.
  No one-off or fortnightly bookings by customers. Admins can still add an extra collection (reschedule, add to run).
- Driver records kg at the kerb to 1 decimal. Only **accepted** (collected) kg counts; rejected/missed count nothing.
- Optional per-collection cap (`settings.kgCapPerCollection`, TBC, default 50).
- Monthly accepted kg per customer is summed (in tenths, no float drift) then **rounded down** to whole entries.
- Entries are per calendar month, so they reset after each draw.
- **Active** = at least one accepted collection in the calendar month (TBC: rolling window).
- One account per address (street + suburb, case/space-insensitive) and per phone.
- Draw: once a month for the previous month (draw day TBC, default 1st). One winner per voucher, 5 distinct winners,
  weighted by entries, deterministic from a stored seed. Audit record = seed, timestamp, entries snapshot, result.
- Unclaimed vouchers can be redrawn after `settings.redrawAfterDays` (TBC, default 14), excluding all earlier winners.
- Voucher status: available → notified (drawn + message sent) → claimed | expired.

## Layout
- `app/(customer)` welcome, signup, login, rules + `(app)/` home, collections, draw, profile
- `app/(driver)/driver` route list + `run?id=` stop recording
- `app/(admin)/admin` overview, runs (+`runs/view?id=` editor), requests, exceptions, customers (+`customers/view?id=`),
  team (drivers + admins), zones (+waitlist), draw, messages (+broadcast), settings (rules, exports, demo reset)
- Design tokens in `app/globals.css` (`@theme`). Light: paper/ink/lilac/butter. Admin is dark blue: night/fog/hot/cool/electric.
  Fonts: Instrument Serif (display), Onest (UI). Chart colours `#6E7BF2` / `#E6457F` are validated for the dark surface.
