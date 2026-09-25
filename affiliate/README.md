# Lap creator program (affiliate service)

A small Node service that runs the creator program with almost nobody in the loop:

```
creator signs up  →  code + tracked link + brief
     ↓
posts videos, says the code
     ↓
viewer installs Lap, types the code in onboarding  →  RevenueCat customer gets creator_code
     ↓
RevenueCat webhook (purchase / renewal / refund)   →  commission ledger (50% of net, 30-day hold)
     ↓
monthly payout run  →  CSV for PayPal Payouts / Wise / Stripe Connect
```

Node ≥ 22.13 (uses the built-in `node:sqlite`), Hono, Zod. One SQLite file, no other infra.

## Run it

```sh
cd affiliate
npm ci
cp .env.example .env      # fill in ADMIN_TOKEN, REVENUECAT_WEBHOOK_AUTH, PUBLIC_ORIGIN, APP_STORE_URL
npm run dev               # http://localhost:8787
npm test && npm run typecheck
```

Deploy anywhere that runs Node and keeps a disk (Fly.io, Railway, a €4 VPS). Point a
volume at `DATABASE_PATH`. Build with `npm run build`, start with `npm start`.

## Wire up RevenueCat

1. RevenueCat → **Integrations → Webhooks → + New**.
2. URL: `https://<PUBLIC_ORIGIN>/webhooks/revenuecat`.
3. Authorization header: any long random string; put the exact same string in
   `REVENUECAT_WEBHOOK_AUTH`.
4. Environment: **Production** (sandbox events are ignored unless `INCLUDE_SANDBOX=1`).
5. Send a test event — the service answers `{"status":"ignored","reason":"test event"}`.

Events are idempotent on RevenueCat's event `id`, so retries are safe.

## Money rules (all env-configurable)

| Rule | Default | Env |
|---|---|---|
| Creator share of **net** proceeds (after Apple's cut) | 50% | `COMMISSION_SHARE` |
| Renewals keep paying for | 12 months after first paid tx | `ATTRIBUTION_WINDOW_MONTHS` |
| Hold before payable (refund window) | 30 days | `HOLD_DAYS` |
| Minimum payout | $20 | `MIN_PAYOUT_CENTS` |
| Apple take-home when RevenueCat omits it | 85% (Small Business Program) | `DEFAULT_TAKEHOME` |

- Attribution is **first-touch**: the first `creator_code` on a customer sticks; later codes don't reassign.
- `INITIAL_PURCHASE`, `RENEWAL`, `NON_RENEWING_PURCHASE` with a price > 0 earn. Trial starts don't; the
  trial-to-paid conversion does.
- `CANCELLATION` with `cancel_reason = CUSTOMER_SUPPORT` is a refund → matching commission is reversed.
  Plain unsubscribes do nothing (the creator already earned that period).

## Pages and endpoints

Public:

| | |
|---|---|
| `GET /` | creator signup form |
| `POST /creators` | signup (`name, email, handle, platform, payout_email`) → welcome page with code, link, stats URL |
| `GET /brief` | the content brief (formats, hooks, disclosure rules, how they get paid) |
| `GET /leaderboard` · `.json` | last-30-day leaderboard |
| `GET /me/:token` | creator's private stats: clicks, attributed customers, ledger, balance |
| `POST /me/posts` | creator submits a posted video URL (`token, url, disclosed`) for QC |
| `GET /r/:code` | tracked link → App Store with `ct=<code>` campaign token (click recorded) |
| `GET /codes/:code` | `{ valid: true, handle }` or 404 `{ valid: false }` — for validating a code live |
| `POST /webhooks/revenuecat` | RevenueCat webhook |

Admin — `Authorization: Bearer $ADMIN_TOKEN`:

| | |
|---|---|
| `GET /admin/creators` · `/admin/creators/:id` | list / detail with ledger and balance |
| `POST /admin/creators/:id/status` | `{ "status": "pending" \| "approved" \| "rejected" }` |
| `GET /admin/posts?status=submitted` | QC queue (check format + `#ad` disclosure) |
| `POST /admin/posts/:id/status` | `{ "status": "ok" \| "flagged" \| "removed" }` |
| `POST /admin/payouts/run` | create payouts for every approved creator over the minimum |
| `GET /admin/payouts?status=pending` · `/admin/payouts.csv` | pending payouts, CSV for PayPal Payouts / Wise bulk |
| `POST /admin/payouts/:id/paid` | `{ "reference": "paypal batch id" }` |
| `POST /admin/payouts/:id/cancel` | undo a payout run (money returns to balance) |

### Monthly payout routine (5 minutes)

```sh
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" $ORIGIN/admin/payouts/run
curl -H "Authorization: Bearer $ADMIN_TOKEN" $ORIGIN/admin/payouts.csv > payouts.csv
# upload payouts.csv to PayPal Payouts / Wise batch, then per row:
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"reference":"<batch id>"}' $ORIGIN/admin/payouts/<id>/paid
```

Set `REQUIRE_APPROVAL=1` to make new creators wait in `pending` until you approve them.
