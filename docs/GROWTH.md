# Lap — Distribution Playbook

How to apply the "content first, app second" playbook (Bible Mode, BoldVoice, etc.) to Lap.
Everything below assumes the mechanic stays as-is: **shield your apps → run a lap (400 m) → bank 15 min → spend it → shield returns.**

---

## 0. Why Lap is unusually well suited to this

The apps that win on TikTok have a mechanic you can explain in one sentence *and show in one clip*. Lap has both:

- **One-sentence pitch:** "My phone won't open TikTok unless I run a lap."
- **Visible mechanic:** a stadium ring filling up, a `+15 MIN` deposit, an unlock countdown, then the shield slamming back. That's a 7-second video with a beginning, middle and end — no explanation needed.
- **Built-in tension:** the punchline writes itself ("the timer ran out mid-video and it locked me out").
- **It looks like effort, not a lecture.** Screen-time content that moralizes gets skipped. Lap content is a person *doing* something.

Bible Mode's marketing and product were the same sentence (stop scrolling → read Scripture → unlock). Lap is the same shape: **stop scrolling → run a lap → unlock.** Never say anything longer than that.

---

## 1. Prerequisites — don't start content before these exist

Traffic with nowhere to land is wasted. In order:

1. **App Store listing live** (not just TestFlight). Needs the Family Controls distribution entitlement approved — request it now, it can take weeks.
2. **Paywall + subscription** wired up — done, via RevenueCat (`pro` entitlement; 4.99/mo · 24.99/yr with 7-day trial · 49.99 lifetime). Hard paywall, no free tier: laps always bank, only spending is gated. See `README.md` → *Lap Pro (RevenueCat)*.
3. **Paywall placement.** It shows after the **first banked lap**, not at the end of onboarding — the user has felt both sides of the deal first. Test after-onboarding vs after-first-lap later as a RevenueCat experiment.
4. **Attribution.** Onboarding screen 2 asks "Who sent you?" (creator code) and "where did you hear about Lap?"; both land on the RevenueCat customer as `creator_code` / `heard_from` and drive the affiliate ledger in `affiliate/`. Add App Store Connect custom product-page links per channel on top.
5. **A demo recording kit** (see §3). Debug builds already have "simulate lap" — that is your content-production tool. Keep it.

---

## 2. The account network (not "the TikTok account")

Bible Mode ran ~33 accounts. You don't need that on day one, but you do need more than one so you can test hooks in parallel without one account's reputation carrying every experiment.

**Phase 1 (weeks 1–4): 3 accounts, you + 1–2 friends.**

| Account | Angle | Face? |
|---|---|---|
| `@lap.app` (official) | Product demos, replies, pinned "how it works" | No — screen recordings + hands |
| Founder account | "I built an app that…" build-in-public, honest stats | Yes |
| Runner/lifestyle account | "things I do to not doomscroll" — Lap is item 3 of 4 | Optional, can be faceless slideshows |

Each account posts **1–2×/day**. Same formats, different hooks. Kill the weakest account/format every Sunday; clone the strongest.

**Phase 2 (once one format hits): scale creators — affiliate-only, automated.**
Recruit 10–20 micro-creators / clippers (1k–30k followers) in running / studytok / productivity / digital-minimalism niches. They sign up at the creator portal (`affiliate/`), get a code + tracked link + the brief, and earn 50% of net revenue from everyone who enters their code, for 12 months, paid monthly after a 30-day refund hold. No per-follower fees, no negotiation; the leaderboard is the incentive. Your only manual work is the QC sample: check posted links for the format and the `#ad` disclosure, then approve.

**Rules that keep the network alive**
- Every account needs its own phone/SIM or at minimum separate device profiles; TikTok groups accounts by device and will suppress duplicates.
- Never post the *same file* across accounts. Same format, re-recorded.
- EU/NL rule: paid creator posts must be marked (`#ad` / "betaald partnerschap"). "Stealth" UGC is a legal risk here, so make the disclosure part of the format rather than hiding it — "I got paid to try this, here's what actually happened" is itself a strong hook.

---

## 3. The three formats to make 500 times

Don't invent campaigns. Pick a format, make 50 variants, look at the numbers, repeat.

### Format A — "The Lockout" (7–12 s, product demo, faceless)
The mechanic as a mini-story. Works because the ending is a punchline.

```
0–2 s   phone screen: tap TikTok → Lap shield: "RUN A LAP"
2–6 s   cut to feet/legs running, Live Activity on lock screen: ring filling
6–8 s   ring crosses the start line → "+15 MIN" springs in (success haptic sound)
8–11 s  TikTok opens. On-screen text: "15 minutes."
11–12 s (optional) countdown hits 0:00 → shield slams back mid-video
```
Text hook overlay variants (test all):
- "my phone makes me run 400m before I can open TikTok"
- "I can't open Instagram unless I run a lap"
- "the only screen time app that actually worked on me"
- "POV: you have 3 minutes of TikTok left and the shield is coming"
- "I gave my screen time a price. 400 metres."

### Format B — "The List" (slideshow, faceless, 5–7 slides)
The productivity-app format: selfie/photo + text hook, then screenshots, one of which is Lap. Cheapest to produce, reusable photos, ranks in TikTok search.

```
slide 1  photo (running shoes, track at dawn, phone face-down) + hook
slide 2  habit 1 (real, not Lap)
slide 3  habit 2 (real, not Lap)
slide 4  "3. I made my apps cost 400 metres" + Lap home screen (bank balance)
slide 5  Lap run screen (oval ring, LAP 2, +30 MIN)
slide 6  screen time before/after screenshot
slide 7  "app is called Lap" (only mention the name once, on the last slide)
```
Hook variants:
- "4 things I changed to get my screen time from 6h to 2h"
- "how I tricked myself into running every day"
- "things that fixed my doomscrolling (that aren't 'just delete the app')"
- "study habits that actually worked after ADHD diagnosis"
- "how to stop doomscrolling if you have zero self-control"

### Format C — "The Deal" (talking head or voiceover, 15–30 s)
Story → problem → mechanic. Founder account and creators. This is the one that converts, not the one that goes viral.

```
hook     "I averaged 5 hours a day on my phone and every blocker I tried I just… turned off."
problem  "Because they all ask you to *decide* not to scroll. I'm bad at deciding."
turn     "So I made the price physical."
mechanic Format A clip in 5 seconds
proof    real screen-time graph or bank balance / "32 laps run all time"
close    "It's called Lap. Interest rate: your legs."
```

**Production rules**
- Shoot vertical, dark UI on real device. The app is dark-only; it looks great at TikTok compression — lean into the orange ring + mint deposit as the two recognizable colors.
- Sound: trending audio for A and B; original voice for C.
- The app name appears **once**, late, as text. Never a "download link in bio" sentence in the first 5 seconds.
- Reply to every comment asking "what app?" with the name. Pin one. Comments asking "what app" are the single best signal a format is working.

---

## 4. Hook library — 30 to start

Each hook = one video. Post them, rank by 3-second retention and "what app?" comments, and only iterate the top 5.

**Identity / ADHD / self-control**
1. "screen time apps don't work on me. this one does because I can't argue with 400 metres."
2. "if you have ADHD and every app blocker failed, watch this"
3. "I don't have discipline so I gave my phone a price"

**Runners / fitness**
4. "my running app and my screen time app are the same app now"
5. "I ran 4k today because I wanted to watch a 2-hour video essay"
6. "the only running motivation that has ever worked: my apps are locked"
7. "run club but the prize is Instagram"

**Students / study**
8. "how I study 3 hours without opening my phone (it's physically locked)"
9. "exam season setup: 400m per 15 minutes of TikTok"

**Parents**
10. "my kid can have TikTok. one lap per 15 minutes." (family-share angle later)

**Curiosity / mechanic**
11. "what happens when the timer hits 0:00" (Format A, cut on the shield)
12. "you can see my apps are locked from my lock screen"
13. "I let TikTok charge me in laps instead of hours"

**Numbers / proof**
14. "screen time down 3h12m in 2 weeks. I also ran 41 laps. same app."
15. "1 lap = 15 minutes. here's what my week cost."

**Contrarian**
16. "stop deleting Instagram. make it expensive instead."
17. "grayscale mode doesn't work. running does."
18. "'just put your phone down' — no. here's what worked."

**Faceless slideshow hooks**
19. "4 things that fixed my attention span"
20. "apps that made me actually go outside"
21. "how I got my mornings back"
22. "digital minimalism that isn't a dumbphone"
23. "productivity apps I actually still use after 3 months"
24. "things I do instead of doomscrolling (ranked)"

**Founder**
25. "I built an app that makes you run before you can scroll. here's day 1 of launching it."
26. "I shipped a screen time app in a week. here's what Apple made me do."
27. "revenue after week 1, no ads: €___"
28. "people said this was a stupid idea. 2,000 people downloaded it."

**Search-bait (long-tail, ranks for months)**
29. "best screen time blocker iphone 2026"
30. "how to stop doomscrolling in bed"

---

## 5. Weekly operating loop

```
Mon   pick 10 hooks from the library (2 formats)
Tue–Sat  post 1–2 per account per day; batch-record on Tue and Fri
Sun   review sheet (below). kill bottom half of hooks. clone top 2 into 5 variants each.
```

**Tracking sheet — one row per video**

| date | account | format | hook | views 24h | views 7d | avg watch % | "what app?" comments | profile visits | installs (attributed) |

**Decision rules**
- < 500 views after 48 h on a healthy account → that hook is dead, don't repost.
- > 20% of comments asking "what app" → double down regardless of view count.
- A format that hits 100k+ once gets **20 more variants** that week, not a celebration post.
- Track **profile visits → App Store taps → installs → trial → paid**. A viral video with a 0.1% profile-visit rate is worse than 10k views with 5%.

---

## 6. The App Store side (where the conversion happens)

TikTok gets curiosity; the store page and onboarding do the selling. Make the path from "what app?" to paywall frictionless.

**Store listing**
- **Name:** `Lap — Run to unlock your apps` (the subtitle is the pitch, not "Screen Time & Focus").
- **Keywords:** screen time blocker, app blocker, doomscrolling, focus, run tracker, digital wellbeing, phone addiction, distraction blocker, opal alternative, one sec alternative.
- **Screenshots (first 3 are everything):** 1) shield screen with `RUN A LAP` on a real app, 2) run screen — oval ring, `LAP 2`, `+30 MIN EARNED`, 3) home bank `45 MIN` with the deal chip `1 LAP · 400 M = 15 MIN`. Then Live Activity countdown, then before/after screen time.
- **Preview video:** Format A, 15 s, no voiceover.
- **Custom product pages:** one per format (runner angle, student angle, ADHD angle). Each TikTok account bio links to its matching page.

**Onboarding → paywall**
- Keep the current "contract" onboarding. The creator-code / "where did you hear about us" screen is screen 2, right after the pitch.
- The paywall shows after the **first banked lap** (`+15 MIN` lands → paywall), and again whenever someone tries to spend without Lap Pro. Placement is the first thing to A/B once there is volume.
- Paywall copy stays in the app's two registers: `THE DEAL` eyebrow, `THE DEAL, EVERY DAY`, three denomination chips, one wink. No feature grid.
- Track: install → onboarding complete → permission granted → first lap → first spend → paid. The first-lap step is your activation metric; anyone who runs one lap has felt the deposit animation and is the person who converts.

**Reviews:** prompt for a rating after the **first bank-in reveal**, never on launch.

---

## 7. First 30 days

| Week | Goal | Done when |
|---|---|---|
| 1 | Prereqs | Store live, RevenueCat products approved, affiliate service deployed with the RevenueCat webhook pointed at it, 3 accounts created, demo-recording kit set up (device + simulate-lap build + screen recorder). |
| 2 | Volume | 30 videos posted across 3 accounts, 3 formats. Sheet filled in daily. |
| 3 | Signal | Bottom 50% of hooks killed. 20 variants of the top 2 hooks posted. First "what app?" comment threads pinned. |
| 4 | Multiply | Top format documented as a 1-page brief (`/brief` on the creator portal); 5 creators signed up and posting with their codes; first custom product page per angle live. |

**Success at day 30 looks like:** one format that reliably does 10k+ views, a known views→install ratio, ≥ 1% install→paid, and a creator brief that someone else can execute without you.

---

## 8. Things to avoid

- Posting one polished launch video and waiting. Volume beats polish; the algorithm is the focus group.
- Explaining. If a video needs a caption to be understood, the format is wrong. Show the shield, the ring, the deposit, the lockout.
- Shame stats ("average person spends 4h32m…"). The design brief already bans these in the app; ban them in content too. Lap is a game with a stake, not a guilt trip.
- Building features instead of posting. For the next 60 days the only product work that matters is the store listing, onboarding, paywall and anything that makes the mechanic more filmable (e.g. a share card after a run: "Ran 3 laps · banked 45 min").
- Paid ads before organic has found a format. Once a format works organically, boosting it with Spark Ads is cheap; before that, ads just buy expensive data.
- Undisclosed paid creator content in the EU. Disclose, and make the disclosure part of the hook.
