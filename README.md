# Lap

Want your screen time back? Run a lap.

One idea: you pick the apps that eat your day. They're shielded. Every lap you run
(default 400 m) puts minutes in your bank (default 15). Spend the bank to unlock the
apps for that long; when it runs out, the shield comes back on its own.

## How it works

- **First launch** — a five-step introduction asks who sent you (creator code / where
  you heard about Lap), requests Screen Time access, lets the user choose apps to
  shield, and sets the lap distance and minutes earned per lap. No paywall here.
- **Blocking** — Apple Screen Time API (`FamilyControls` + `ManagedSettings`). The
  user picks apps/categories with `FamilyActivityPicker`; `Shield.block()` shields them.
- **Unlocking** — `ScreenTime.spend(seconds)` clears the shield and starts a
  `DeviceActivity` schedule. The schedule must start successfully before the bank
  is charged or the shield lifts. The `LapMonitor` extension's `intervalDidEnd`
  re-shields even when the app is killed. (Schedules need ≥ 15 min, hence the
  15/30/60 buttons.)
- **Laps** — `LapTracker` uses CoreLocation (background location on). A lap counts when
  you've covered `lapMeters`, or when you return to your start point after at least half a lap.
  Stale, inaccurate, tiny, and implausibly fast location updates are excluded from distance.
  MapKit shows the live route, start marker, and lap area during a run. A pixel coach
  appears briefly on the first completed lap.
- **Countdown** — a WidgetKit Live Activity shows the unlock timer on the Lock Screen
  and Dynamic Island. A local notification announces when the apps are locked again.
- **Lap Pro** — one RevenueCat entitlement (`pro`) in front of *spending*. Laps always
  bank; `spend()` refuses without `pro` and shows the paywall (fail-closed: the shield
  stays up). The paywall first appears after the first banked lap, and from Settings.
- State is shared with the extension via the `group.nl.lerai.lap` app group.

## Lap Pro (RevenueCat)

Hard paywall, no free tier. Prices are tiers, so EUR and USD read the same.

| RevenueCat package | App Store product | Price | Notes |
|---|---|---|---|
| `$rc_monthly`  | `nl.lerai.lap.pro.monthly`  | 4.99 / mo   | no trial |
| `$rc_annual`   | `nl.lerai.lap.pro.annual`   | 24.99 / yr  | 7-day free trial · **default** |
| `$rc_lifetime` | `nl.lerai.lap.pro.lifetime` | 49.99 once  | non-consumable |

**App Store Connect**

1. Monetization → Subscriptions → new group **Lap Pro**. Add the monthly and annual
   subscriptions with the product IDs above, same group (so Apple handles monthly ↔ annual
   as an upgrade/downgrade). Annual: add an introductory offer, *free*, 7 days.
2. In-App Purchases → new **non-consumable** `nl.lerai.lap.pro.lifetime`.
3. Turn on Family Sharing for annual and lifetime. Enroll in the Small Business Program (15%).
4. Agreements → sign the Paid Apps agreement, add banking + tax, or products never leave
   "Missing Metadata".

**RevenueCat** (app.revenuecat.com)

1. New project *Lap* → add an **App Store** app with bundle ID `nl.lerai.lap`. Upload the
   App Store Connect API key and the In-App Purchase key it asks for.
2. Products → import the three product IDs.
3. Entitlements → `pro` → attach all three products.
4. Offerings → `default` → packages `$rc_monthly`, `$rc_annual`, `$rc_lifetime` mapped to
   the products; mark the offering current. (A `winback` offering for lapsed annuals is a
   later experiment, not launch.)
5. Copy the app's **public** SDK key (`appl_…`) — this is not secret; it ships in the app.
6. Integrations → Webhooks → point at the affiliate service (see `affiliate/README.md`).

**Build with the key**

```sh
REVENUECAT_API_KEY=appl_xxx DEVELOPMENT_TEAM=XXXXXXXXXX xcodegen generate
```

It becomes the `REVENUECAT_API_KEY` build setting → `RevenueCatAPIKey` in Info.plist,
read by `Pro.configure()`. Without a key, Debug builds treat everyone as Pro so the
prototype stays usable; Release builds fail closed. Test purchases with a Sandbox
Apple ID on a device; the paywall reads live prices and the trial length from StoreKit.

Code: `App/Services/Pro.swift` (entitlement state, attribution attributes
`creator_code` / `heard_from`, purchase, restore) and `App/Views/PaywallView.swift`.
Terms/Privacy links live in `Pro.termsURL` / `Pro.privacyURL` — replace the privacy
placeholder before submission.

## Growth

- `docs/GROWTH.md` — the content-led distribution playbook (formats, hooks, weekly loop).
- `affiliate/` — the creator program: signup → code + tracked link, RevenueCat webhook →
  commission ledger with refund hold, leaderboard, monthly payout CSV. Its README has
  the deploy and RevenueCat webhook steps.

## Build

Requires Xcode 16, iOS 17+, a **physical device** for Screen Time shielding
and the Family Controls capability on your App ID (development works without Apple's
distribution approval; TestFlight/App Store needs the entitlement request).

```sh
brew install xcodegen
DEVELOPMENT_TEAM=XXXXXXXXXX xcodegen generate
open Lap.xcodeproj
```

To compile the app and both extensions without signing, choose an installed simulator
from `xcrun simctl list devices available`, then run (replace `iPhone 17` if needed):

```sh
xcodebuild -project Lap.xcodeproj -scheme Lap \
  -destination 'platform=iOS Simulator,name=iPhone 17' build CODE_SIGNING_ALLOWED=NO
```

Debug builds show a "simulate lap" button on the run screen for demoing the flow indoors.

## Layout

```
project.yml              XcodeGen spec (app + monitor and widget extensions)
App/LapApp.swift         entry, formatting helpers
App/Shared/Shield.swift  app-group defaults + shield on/off (shared with extension)
App/Services/            ScreenTime (bank, unlock, schedule), LapTracker (GPS), Pro (RevenueCat)
App/Views/               onboarding, Home, Run, MapKit route, Settings, Paywall, visual components
App/Assets.xcassets/     app icon and pixel coach image
LapMonitor/              DeviceActivityMonitor extension: re-locks when time runs out
LapWidgets/              Lock Screen and Dynamic Island countdown
DESIGN.md                visual direction and UI tokens
docs/GROWTH.md           distribution playbook
affiliate/               creator/affiliate service (Node + SQLite)
```
