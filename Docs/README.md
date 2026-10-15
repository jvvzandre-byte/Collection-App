# Recycling Collection App

A mobile/web app and desktop admin panel for a household recycling collection business. Households sign up for kerbside collection, the business collects on fixed days per area, and every accepted kilogram earns one entry into a monthly draw for 5 vouchers.

The goal is growth: reach more households, keep them active, and use the draw as the incentive.

**Status:** Planning. Target pilot mid-January 2027, wider launch February 2027.

---

## How it works

1. A household signs up and enters their address.
2. The app matches the address to a **zone** and tells them their **collection day** (for example, Zone A = Tuesdays).
3. The household opts in for a collection, or sets up a standing weekly/fortnightly pickup.
4. On collection day, a driver follows the route, weighs the material at the kerb and records the accepted kg.
5. Each accepted kg becomes one draw entry for that month.
6. After month end, the admin runs the draw. 5 different vouchers go to 5 distinct winners.

Collection is free for customers. Their incentive is the chance to win.

---

## Users and roles

| Role | Where | What they do |
|---|---|---|
| **Customer** | Mobile / web (PWA) | Sign up, opt in to collections, view history, kg total, entries and past winners |
| **Driver** | Mobile web (driver view) | See the day's route, mark stops collected or rejected, enter kg |
| **Admin** | Desktop panel | Manage zones, runs, customers, exceptions, vouchers and the monthly draw |

---

## Features

### MVP
- Sign-up and login with phone verification
- Address capture and zone matching (suburb list), with a waiting list for areas not yet served
- Collection opt-in and standing weekly/fortnightly pickups with a skip button
- Admin: zones, collection days, driver assignment per run, request queue, exceptions
- Driver view: route list, collected / rejected / missed, kg entry
- Entries ledger, monthly prize setup and draw tool with audit record
- Notifications (stubbed at first, real SMS/WhatsApp later)

### Phase 2
- Referral bonus entries
- Impact stats ("you've recycled X kg")
- Route optimisation
- Dashboards: active vs lapsed customers, kg per zone, waiting-list demand

### Phase 3
- Multi-depot or multi-vehicle support
- Native app store apps
- Sponsor portal for voucher partners

---

## Rules (the source of truth)

These must stay consistent across code, tests and the published competition terms. **Items marked TBC need a decision before the draw is built.**

### Entries
- Weight is recorded by the driver at the kerb, to one decimal place.
- Only **accepted** kg counts. Contaminated material (wet, mixed with rubble) can be rejected.
- Monthly accepted kg per customer is summed, then **rounded down** to whole entries at month end.
- Optional cap on counted kg per collection: TBC (suggested 50 kg).
- Entries reset after each draw.

### Active customer
- A customer is **active** for a month if they had at least one accepted collection in that month. (TBC: whether to use a rolling 30/60 day window instead.)

### One account per address
- Prevents one household from multiplying entries.

### The draw
- Runs once per month for the previous month (suggested: on the 1st).
- Picks **5 distinct winners**, one per voucher, at random from the entries.
- A customer can win at most one voucher per draw.
- Each draw stores an audit record: seed, timestamp, entries snapshot and result.
- Unclaimed vouchers are redrawn after 14 days (TBC).
- Voucher fields: name, sponsor, value, image, expiry, status (drawn, notified, claimed, expired).

### Legal
- Competition terms must be reviewed under the Consumer Protection Act (promotional competitions).
- POPIA: consent at sign-up, privacy policy, secure storage of names, phone numbers and addresses.
- Publish the draw rules inside the app.

---

## Architecture

### Approach: app first, database later

The app is built against a **data-access layer** with an in-memory/localStorage mock behind it. A Supabase implementation replaces the mock once the application works end to end.

**Hard rule: UI code never accesses storage directly.** Screens call functions such as:

```
getZones()
createCollectionRequest(input)
assignDriver(runId, driverId)
markCollected(stopId, kg)
runDraw(month)
```

Swapping the backend then means writing a second implementation of the same functions, not rewriting screens.

### Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (React) + TypeScript, built as an installable PWA |
| Admin panel | Same codebase, desktop routes, role-based access |
| Data (now) | Mock store persisted to localStorage, loaded with seed data |
| Data (later) | Supabase (Postgres, auth, storage, row-level security) |
| Maps | Google Maps or Mapbox (placeholder until later) |
| Notifications | WhatsApp Business API or SMS (stubbed, logged to a "sent messages" screen) |
| Hosting | Vercel + Supabase |

### Suggested structure

```
/app
  /(customer)      customer sign-up, collections, history, entries
  /(driver)        route list, stop completion, kg entry
  /(admin)         zones, runs, customers, vouchers, draw
/lib
  /types           User, Zone, CollectionRequest, Collection, Entry, Draw, Voucher
  /data            data-access interface + mock implementation + seed data
  /logic           entries, active-customer rule, winner selection (pure functions)
/tests             unit tests for /lib/logic
```

### Core data types (future tables)

`users`, `addresses`, `zones`, `collection_requests`, `routes/runs`, `collections` (kg, driver, status), `entries` (ledger), `draws`, `draw_winners`, `vouchers`, `notifications`, `audit_log`.

### Design principles
- Entry calculation, active-customer rule and winner selection are **pure functions** with unit tests.
- Roles exist from day one: a real `currentUser` and role, with every route and function gated. A dev-only role switcher flips between customer, driver and admin.
- The draw must move **server-side** when the database goes in. The browser version is for development only.
- Driver screens are mobile-first, big buttons, light on data and tolerant of poor connections.

---

## Build order

1. Project setup: Next.js PWA, TypeScript, role areas, dev role switcher
2. Types, seed data (3 zones, ~30 households, 2 drivers) and mock data layer
3. Customer flow: sign-up, zone matching, collection day, opt-in/standing pickup, history
4. Admin: zones and runs, driver assignment, request queue, exceptions
5. Driver view: route list, collected/rejected, kg entry
6. Entries ledger, vouchers and draw tool, with tests
7. Stubbed notifications
8. Swap in Supabase: migrations from the types, real auth, row-level security, server-side draw, real notifications
9. Pilot with 20-50 households in one zone

## Timeline

| When | Work |
|---|---|
| Late Oct 2026 | Decisions, zone list, wireframes, draw rules, legal check |
| Early Nov | Project setup, types, mock data layer |
| Mid-late Nov | Customer flow |
| Early Dec | Admin panel and driver view |
| Mid Dec | Entries ledger, vouchers, draw tool and tests |
| Late Dec-early Jan | Buffer, bug fixing, Supabase swap |
| Mid Jan 2027 | Pilot, 20-50 households in one zone |
| Feb 2027 | Fix pilot findings, open more zones |

---

## Operations

- **Fleet:** 2 drivers/vehicles to start, expandable.
- **Collection:** fixed collection day per zone, with a capacity limit per run (suggested 40 stops).
- **Weighing:** each driver carries a portable hanging scale and weighs at the kerb. The kg must be tied to the household.
- **Customers:** households only. No commercial accounts.
- **Vouchers:** 5 per draw, each different, from various sponsors.

---

## Open decisions

- [ ] Launch zones, suburbs and collection days
- [ ] Per-collection kg cap
- [ ] Active customer definition (calendar month vs rolling window)
- [ ] Redraw rule for unclaimed vouchers
- [ ] Draw day of the month
- [ ] Capacity limit per run
- [ ] Competition terms and POPIA privacy policy reviewed
- [ ] Notification channel: WhatsApp, SMS or both

---

## Working with Claude Code

Keep a `CLAUDE.md` in the repo root containing:
- The rules in this README (entries, active customer, draw)
- "UI code never accesses storage directly"
- The role model and route gating
- A reminder that logic functions are pure and tested

---

## Getting started

Not scaffolded yet. Once the project exists:

```bash
npm install
npm run dev     # run the app locally
npm test        # run logic tests
```
