# Lap — Design Brief

Lap trades laps for screen time: 400 m of running buys 15 minutes of your
distracting apps back. This document is the visual contract for that trade.
It is opinionated on purpose — where the research disagreed, we picked a side.

---

## 0. What the best apps do (the teardown)

| App | What we steal | What we avoid |
|-----|---------------|----------------|
| **Opal** | Pure-black canvas, monochrome system, pastel gradients reserved *only* for milestone moments. Friendly companion tone — never guilt, never shame-streaks. Gems as milestone objects. | Their gamification is abstract (Focus Score). Ours is literal currency — stronger. |
| **one sec** | The intervention *is* the brand: a slow breathing orb in violet on near-black. Proves a single animated object can carry an identity. | Intervention-per-open model is passive friction. Lap's friction is physical — keep it that way. |
| **Forest** | Progress you can *see grow* (a tree), cozy warm-green palette, playful collectibility. | Cute illustration maximalism. Lap stays an instrument, not a garden. |
| **Roots** | Balance Score + "beautiful illustrations" + mint/salad greens on light. Monk Mode = friction is a feature, not a punishment. | Light-first UI reads "wellness app". A run at 7am and a bank vault both say dark. |
| **Jomo** | "Joy of missing out" wit, block-strength as user choice, budget progress bar ("stay in the green"). | Feature sprawl. Lap has exactly one verb: run. |
| **Nike Run Club** | True black stadium-tunnel canvas, ONE hero accent (Volt `#CCFF00`), screaming condensed caps, 88pt tabular run numbers, 280pt progress ring, `.heavy` haptics on commitment. The tracking screen is *equipment*, not an app. | Their display face (Trade Gothic) is licensed; we approximate with rounded + caps + tracking. |
| **Strava** | One accent total (`#FC4C02`), route polyline as the hero object with luminance halo, `monospacedDigit()` everywhere, flat — no shadows, hairline dividers, parchment-warm neutrals. | White canvas & feed density. Lap has no feed; the map serves the run, not the social graph. |

**The pattern that matters:** every one of these apps owns exactly *one object*
(Opal's gem, one sec's orb, Forest's tree, NRC's volt ring, Strava's polyline).
Lap's object is the **oval** — a 400 m track is literally a stadium shape, and a
lap counter that fills a stadium ring is something no one else can claim.

**Dark-first is the category norm.** Opal, NRC, Strava-dark, one sec, Jomo all
live on near-black. Forest and Roots are the light-side outliers — and Roots'
users literally file "please add dark mode" bugs. The prototype already forces
`.preferredColorScheme(.dark)`. That's the call: **Lap is dark-only in v1.**

---

## 1. Positioning & voice

**Positioning:** Lap is a game you play against your own distraction, with a
stake you actually feel. Not a blocker, not a tracker — an **exchange**. The
track is where you earn; the bank is where you spend.

**Voice:** a track coach moonlighting as a bank teller. Terse. Warm. Slightly
cheeky about the deal, never about you. It speaks in two registers that never
mix:

- **Track register** (effort, earning): RUN A LAP · DISTANCE · EARNED · LAP 2 · CROSS THE LINE
- **Vault register** (currency, spending): IN THE BANK · SPEND 15 · UNLOCKED · BANK IT · THE DEAL

Every label in the app belongs to exactly one register. The moment a screen
mixes them ("earn minutes to unlock apps"), the metaphor leaks. Keep the two
economies airtight — the two accent colors below enforce the same split.

**Copy rules**
- Buttons are verbs, shouted: `RUN A LAP`, `BANK IT`, `SPEND 15`, `FINISH & BANK`.
- Numbers do the persuading. Show the rate, not the rationale: `1 lap · 400 m = 15 min`.
- Never moralize. No "you've been scrolling too long." The shield closing at
  0:00 is the only message needed.
- One wink allowed per screen, in the small print: `Interest rate: your legs.`

---

## 2. Color — two economies, one accent each

Lap runs two currencies of meaning: **Tartan** marks effort (everything you do
to earn), **Vault** marks currency (everything you own or spend). They never
appear on the same element. A user who learns nothing else learns this:
*orange is what you do, mint is what you have.*

### Track (effort) — Tartan
| Token | Hex | Role |
|-------|-----|------|
| `tartan` | `#FF4F1F` | The effort accent: lap-ring fill, RUN A LAP CTA, route polyline, "earned" deltas. Brighter and redder than Strava's `#FC4C02` — reads track tartan, not Strava clone. |
| `tartanPressed` | `#D64015` | Pressed state on Tartan fills. |
| `tartanHalo` | `#FF4F1F` @ 30% | Luminance halo under the route polyline and behind the oval ring (Strava's halo trick). |
| `tartanDim` | `#FF4F1F` @ 14% | Ring track, tint fills behind Tartan chips. |

### Vault (currency) — Mint
| Token | Hex | Role |
|-------|-----|------|
| `vault` | `#3DDC97` | The currency accent: bank balance when unlocked, "earned 15 min" readouts, spend-denomination chips, unlocked state, deposit confirmations. |
| `vaultPressed` | `#2AB87B` | Pressed states. |
| `vaultDim` | `#3DDC97` @ 14% | Tint fills behind mint chips; depleting-ring track. |

### Canvas & surfaces (neutral ladder, cool-leaning like Opal/NRC)
| Token | Hex | Role |
|-------|-----|------|
| `void` | `#000000` | Every canvas. Pure black — the stadium tunnel and the vault interior. |
| `surface1` | `#121214` | Cards, setup rows, sheet backgrounds. |
| `surface2` | `#1D1D21` | Pressed fills, input fields, chip wells. |
| `hairline` | `#2C2C31` | 0.5pt dividers, ring lane-lines at low alpha. |

### Ink
| Token | Hex | Role |
|-------|-----|------|
| `ink` | `#F4F4F0` | Primary text — every hero number. Warm-white, not clinical `#FFF`. |
| `inkSecondary` | `#9A9AA3` | Labels, metadata, "1 lap (400 m) = 15 min". |
| `inkTertiary` | `#5F5F68` | Footnotes, disabled, the wink copy. |

### Semantic (rare — the two accents do 95% of the work)
| Token | Hex | Role |
|-------|-----|------|
| `amber` | `#FFB224` | GPS weak, bank below minimum spend. |
| `red` | `#FF453A` | Destructive only: "Lock apps now", permission-denied errors. |
| `lane` | `#F4F4F0` @ 40% | Lane-line strokes and the start-line mark (ink, not a new color). |

### Milestone gradient (Opal's rule)
Gradients exist **only** for milestone moments — first lap, first deposit,
round-number lap counts. One approved pair: `tartan → vault` at 135°. It is
literally the trade rendered as color: effort becoming currency. Never as a
background; only inside celebration objects and the app-icon ring.

### SwiftUI tokens
```swift
extension Color {
    init(hex: UInt, opacity: Double = 1) {
        self.init(.sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity)
    }
    static let tartan        = Color(hex: 0xFF4F1F)
    static let tartanPressed = Color(hex: 0xD64015)
    static let tartanHalo    = Color(hex: 0xFF4F1F, opacity: 0.30)
    static let tartanDim     = Color(hex: 0xFF4F1F, opacity: 0.14)
    static let vault         = Color(hex: 0x3DDC97)
    static let vaultPressed  = Color(hex: 0x2AB87B)
    static let vaultDim      = Color(hex: 0x3DDC97, opacity: 0.14)
    static let void          = Color(hex: 0x000000)
    static let surface1      = Color(hex: 0x121214)
    static let surface2      = Color(hex: 0x1D1D21)
    static let hairline      = Color(hex: 0x2C2C31)
    static let ink           = Color(hex: 0xF4F4F0)
    static let inkSecondary  = Color(hex: 0x9A9AA3)
    static let inkTertiary   = Color(hex: 0x5F5F68)
    static let amber         = Color(hex: 0xFFB224)
    static let lapRed        = Color(hex: 0xFF453A)
}
```

---

## 3. Typography

Two type voices, mirroring the two economies — both from the system stack.

**Vault voice — SF Rounded.** Coin-friendly, game-side, slightly soft. Black
weight, tabular digits. This is what money looks like in Lap.
`.system(size:, weight: .black, design: .rounded)` + `.monospacedDigit()`.

**Track voice — condensed-feeling caps.** System SF has no condensed cut; we
get the athletics effect with uppercase + heavy weight + wide tracking on
labels, and tight large rounded numerals for live stats.
*(Optional upgrade: bundle **Archivo Black** or **Oswald** for run-screen
labels — free-licensed, single weight each — if the track voice ever needs to
scream louder. V1 ships system-only.)*

| Role | Spec | Use |
|------|------|-----|
| Scoreboard | Rounded 88/Black, tabular | Bank balance, lap count, unlock countdown |
| Hero stat | Rounded 56/Black, tabular | Distance, earned minutes on run screen |
| Result stat | Rounded 32/Heavy, tabular | Post-run "you banked 30" |
| Screen title | 28/Heavy (default design) | "Lap", "Run", sheet titles |
| Athletic label | 13/Bold ALL-CAPS, `.tracking(1.2)`, inkSecondary | `DISTANCE`, `EARNED`, `IN THE BANK`, `UNLOCKED` |
| Button verb | 20/Black ALL-CAPS | `RUN A LAP`, `FINISH & BANK` |
| Denomination | 17/Heavy, tabular | `15`, `30`, `60` spend chips |
| Body | 17/Regular | Setup cards, settings |
| Sub | 15/Regular, inkSecondary | Card subtitles, secondary readouts |
| Footnote | 13/Regular, inkTertiary | Exchange-rate line, disclaimers, the wink |
| Caption | 11/Semibold ALL-CAPS, `.tracking(0.8)` | State eyebrow above hero numbers |

Rules: `.monospacedDigit()` on **every** number that changes (bank, countdown,
laps, distance, elapsed). Hero numbers are fixed-size — the 88pt balance *is*
the layout; Dynamic Type applies to body/sub/footnote only.

---

## 4. Surfaces

### 4.1 Home — the Bank

Home is a balance sheet with a start line. One hero, one CTA, nothing else
fights for attention.

- **Bank readout (center hero).** Eyebrow caption in Athletic label:
  `IN THE BANK` (inkSecondary) or `UNLOCKED` (vault). Under it, the Scoreboard
  number at 88/Black Rounded tabular: `45 min` banked (ink) or `14:32` remaining
  (vault — when unlocked, the number and its eyebrow are both Mint: spending
  state is a Vault moment). Below: sub readout `32 laps run all time`,
  inkSecondary.
- **The deal chip.** Between hero and CTA: a pill, `surface1` fill, hairline
  edge, with the exchange rate set as `1 LAP · 400 M = 15 MIN` in Athletic
  label + denomination. This is the contract restated every time you look at
  your money. Dashed `lane`-color tick marks at both ends suggest a ticket
  perforation — subtle, one element only.
- **Spend denominations.** `15` / `30` / `60` chips — capsule wells of
  `surface2` with `vault` text and `vaultDim` fill on the enabled state; they
  read as coins. Disabled: `surface2` + inkTertiary. An unlocked-state swap:
  chips collapse into the countdown + a `red` text button `Lock apps now`.
- **RUN A LAP.** Full-width pill, 22pt padding — the one Tartan fill on the
  screen (`tartan`, pressed `tartanPressed`, scale 0.98, `.impactOccurred(.heavy)`).
  Inside the button, 1pt `lane`-color dashes run parallel to the long edges at
  15% opacity — the button *is* a piece of track. Verb at 20/Black caps.
- **Setup cards** (not-authorized / no-app-selection states): `surface1`,
  16pt continuous corners, Athletic-label title + Sub description, full-width,
  left-aligned — the current `.thinMaterial` goes away; material blur reads
  frosted-glass, not vault.
- **Background detail:** at very low opacity (6–8%), three concentric lane-line
  ovals center the bank hero — the track ghosted behind the vault. One
  decorative element per screen, this is Home's.

### 4.2 Run — the Track

The run screen is equipment (NRC's lesson): black instrument panel, ring
dominant, map in service of the ring.

- **The Oval (hero).** The progress ring is **a stadium, not a circle** — a
  `Capsule`/`RoundedRectangle(cornerRadius: r/2)` stroke, ~300×210pt landscape
  stadium, 16pt stroke, `tartanDim` track, `tartan` fill progressing clockwise
  from the start line. Inside it, 2 concentric lane-line strokes (offset 10pt,
  `lane` @ 25%) — a track seen from above. At the top-left curve apex sits the
  Start Line: a 10pt-wide `ink` segment across the ring the fill "crosses" on
  every lap completion.
- **Center field:** lap count at 88/Black Rounded; under it `LAP`/`LAPS`
  Athletic label; under that, the earned readout in `vault`: `+15 MIN EARNED`,
  ticking up `+15` with a scale-pop + `.notificationOccurred(.success)` on each
  crossing.
- **Stats row** (top, below the elapsed clock): DISTANCE / PACE-ISH / EARNED as
  three Athletic-label + Hero-stat cells — or keep it to elapsed clock top-bar
  + distance/earned stacked under the oval (current layout), both within spec.
- **Map layer.** Secondary, dark-only: `MKMapView` with `.standard` dark style,
  collapsed into a bottom-corner card (~120pt, 16pt radius) or behind the oval
  at 20% opacity. Route polyline: 3pt `tartan` + 1pt `tartanHalo` (Strava's
  recipe). Start marker: `ink` dot with `tartan` outline. The map never
  outranks the ring — it is evidence, not interface.
- **Controls.** Pre-run: `START` full-width `tartan` pill. Running: `FINISH &
  BANK` flips to `vault` fill — the button changes economy the moment stopping
  becomes a deposit. Small `Close` text button top-left in inkSecondary.
- **Ambient:** elapsed clock top-center tabular; GPS-weak state swaps the clock
  eyebrow to `amber`. No photography, no gradients — this screen is the
  flattest in the app.

### 4.3 Onboarding — the Contract

Onboarding is signing the deal: three screens, one track-side visual running
through them, permission asks framed as contract clauses — not system dialogs
fired back-to-back.

- **Page structure:** big Scoreboard object top (the motif object, see §6),
  Title + one short paragraph, one action bottom-pinned. Progress = 3
  start-line segments in the header, not dots.
- **Screen 1 — The Pitch.** The Oval ring slowly filling (ambient 8s loop).
  Title: `Want your screen time back?` Body: `Lap blocks your worst apps. Run a
  lap, bank the minutes, spend them when you want. That's the whole deal.`
  CTA `SEE THE DEAL` (tartan).
- **Screen 2 — The Terms.** Rate steppers rendered as the contract itself:
  `LAP LENGTH 400 m` / `PER LAP 15 min` — denomination-style steppers.
  Then the two permission cards as clauses: `CLAUSE 1 — Screen Time access`
  (authorize + FamilyActivityPicker; this is where the shield gets its keys)
  and `CLAUSE 2 — Location` (so the track knows when you circle it). Cards are
  `surface1` with a `tartan` edge-tick on the left — contract clauses get a
  signature line.
- **Screen 3 — The First Lap.** Oval completes once, a `vault` `+15 MIN`
  springs into the bank slot. Copy: `Your first 15 minutes are 400 m away.`
  CTA `TAKE THE DEAL` → drops into Home with the setup cards lit.
- **Tone check:** zero guilt copy. We never show "average screen time: 4h32m"
  shame-stats (Opal's research — it makes people feel bad and leave). The
  contract is the persuasion.

### 4.4 Settings (minor surface)

Standard `Form`, but `The deal` section gets the deal-chip treatment as its
header, and stats (`Laps run`, `Banked`) render in denomination style — tabular
Rounded 17 — not default List styling.

---

## 5. Motion

Lap's motion vocabulary is two physical metaphors: **a runner's lap**
(deterministic, linear) and **a bank counter** (tick-and-settle).

1. **Numbers count, never cut.** Balance, earned, countdown: animate by
   counting through intermediate values (~300–500ms, `easeOut`). A bank that
   jumps is a bank you don't trust. Timers/countdowns tick linearly — real
   clocks don't spring.
2. **The Oval fills linearly.** Progress is GPS-truth: `easeOut` on updates,
   never a spring that overshoots the runner's actual position.
3. **Crossing the Line.** On each lap completion: the fill passes the start
   line → ring flashes to `ink` for 150ms → `+15` springs out of the center
   field into the earned slot (`response 0.4, dampingFraction 0.65`) →
   `.notificationOccurred(.success)`. This is the app's signature beat — it
   must feel like money deposited.
4. **Bank-in reveal.** `FINISH & BANK` → oval shrinks into a mint coin-dot that
   flies to the bank balance (matched-geometry style, 500ms), balance counts
   up. The literal trade: shape changes from track to coin.
5. **Unlock drain.** When spending, the vault countdown is a ring *depleting*
   in `vault` — time visibly burning. Last 60s: eyebrow pulses to `amber`,
   then the shield returns with a single `.warning` haptic. No celebration on
   re-lock — it's gravity, not punishment.
6. **Milestones only glow.** The `tartan → vault` gradient and a 8-particle
   burst (Opal/NRC scale — never confetti storms) appear only on: first lap
   ever, first deposit, lap-count milestones (10/25/50/100).
7. **Springs are for delight, linear is for work.** Buttons: scale 0.98
   instant. Sheets: default system. Progress: linear. Celebration:
   `response 0.4 / damping 0.6`.
8. **Haptics are verbs:** `.heavy` on RUN A LAP and FINISH & BANK (commitment,
   NRC's rule), `.success` on crossing the line and deposit, `.selectionChanged`
   on denominations, `.warning` on re-lock. Nothing on passive events.
9. **Reduce Motion:** counting animations collapse to 100ms fades; the
   crossing flash, particles, and fly-to-bank are dropped entirely; timers
   still animate (that's function, not decoration).

---

## 6. Motifs — five objects Lap owns

1. **The Oval.** Every progress indicator in Lap is a stadium/capsule, never a
   circle. Run screen ring, bank-state ring, icon, loading states, even the
   denomination chips echo it. Circles belong to everyone; the oval is the lap.
2. **Lane Lines.** Two or three parallel offset strokes at low opacity — on
   the RUN A LAP button, behind heroes, in onboarding. The instant-read texture
   of a track. Used like Nike uses sole-tread patterns.
3. **The Start Line.** A short bold `ink` segment marking where a lap begins.
   On the Oval it's the lap trigger; in onboarding it's the progress indicator;
   as a hairline-width glyph it can divide sections. One mark, always meaning
   *"a lap starts here."*
4. **The Vault.** Currency is physical: denominations are coins (capsule
   wells), the bank is a `vault`-mint readout, deposits animate as a coin
   flying home. Mint is the only place currency appears — `vault` never
   touches effort UI.
5. **The Scoreboard.** One hero number per screen, Rounded Black tabular at
   stadium scale (88pt), eyebrowed by a wide-tracked caps label. `45 MIN` /
   `LAP 2` / `14:32` — every screen is read like a stadium scoreboard.

*(Honorable mention for later: **The Ticket** — perforated-edge cards for the
deal chip and achievements. Keep it out of v1; five is already a lot to own.)*

---

## 7. App icon

**"The Oval in the void."** A near-black (`#060607`) rounded-square field.
Centered: a stadium-oval ring in flat `tartan` `#FF4F1F`, stroke thick (~15%
of the short axis), with two faint lane-line strokes inside it at 25% ink.
At the top-left curve, the start-line segment in `ink` `#F4F4F0` — the only
second color. No text, no gradient on the shipping icon (the `tartan → vault`
gradient is reserved for the TestFlight/milestone variant). Reads at 40px as a
glowing track seen from above — unlike Opal's gem (object), Strava's orange
square (flat mark), or Forest's tree (illustration), Lap's icon *is the
mechanic*: a lap, waiting to be run.

**Alternate concept:** the same oval as an embossed `vault`-mint coin on
black — a coin stamped with a track. Stronger on "earn"; weaker on "run".
Start with the track; A/B the coin at icon-test time.

---

## 8. Do / Don't

**Do**
- Keep exactly two chromatic accents, scoped to their economies (Tartan =
  effort, Vault = currency).
- Ship dark-only. Design the light theme only if users ask.
- Make every number tabular and every hero number huge.
- Let the Oval be a stadium everywhere it appears.
- Render the trade in the UI: earning moments are orange, having/spending
  moments are mint, and the trade itself animates (oval → coin).
- Keep copy terse, in-register, shame-free.

**Don't**
- No third accent, no purples/blues, no gradient backgrounds.
- No streaks, no guilt stats, no "you failed" states (Opal's rule: shame
  churns users).
- No shadows on cards — flat on black (NRC/Strava rule); the only glow is
  `tartanHalo` under live effort UI.
- No circular progress rings — the circle is the one shape we gave up.
- No illustrative characters/mascots (Forest/Roots territory) — Lap's
  personality is the track-and-vault system itself.
- Don't let the map become the screen; the ring is the instrument.

---

## 9. First-apply checklist (this codebase)

- `LapApp.swift` — keep `.preferredColorScheme(.dark)`; it is now canon.
- `HomeView.swift` — retint: `orange` → `.tartan` (CTA) / `.vault` (bank when
  unlocked currently green is correct — swap to `.vault` token); hero to
  Rounded 88; add deal chip; setup cards to `surface1` (drop `.thinMaterial`).
- `RunView.swift` — circle ring → stadium `Capsule` ring; `orange` → `.tartan`,
  `green` → `.vault`; add start-line mark + earned `+15` spring on lap
  completion; map card optional behind flag.
- `SettingsView.swift` — deal section header chip; tabular stat values.
- New: `Colors.swift` with the §2 extension — the only place hex values live.
