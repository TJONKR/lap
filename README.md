# Lap

Want your screen time back? Run a lap.

One idea: you pick the apps that eat your day. They're shielded. Every lap you run
(default 400 m) puts minutes in your bank (default 15). Spend the bank to unlock the
apps for that long; when it runs out, the shield comes back on its own.

## How it works

- **First launch** — a four-step introduction requests Screen Time access, lets the
  user choose apps to shield, and sets the lap distance and minutes earned per lap.
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
- State is shared with the extension via the `group.nl.lerai.lap` app group.

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
App/Services/            ScreenTime (bank, unlock, schedule), LapTracker (GPS)
App/Views/               onboarding, Home, Run, MapKit route, Settings, visual components
App/Assets.xcassets/     app icon and pixel coach image
LapMonitor/              DeviceActivityMonitor extension: re-locks when time runs out
LapWidgets/              Lock Screen and Dynamic Island countdown
DESIGN.md                visual direction and UI tokens
```
