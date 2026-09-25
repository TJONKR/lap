import type { Balance, LeaderboardRow } from "./store.js";
import type { Creator, LedgerEntry } from "./db.js";

const css = `
:root{--void:#000;--surface1:#121214;--surface2:#1d1d21;--hairline:#2c2c31;--ink:#f4f4f0;--ink2:#9a9aa3;--ink3:#5f5f68;--tartan:#ff4f1f;--vault:#3ddc97}
*{box-sizing:border-box}body{margin:0;background:var(--void);color:var(--ink);font:17px/1.5 -apple-system,system-ui,sans-serif}
main{max-width:640px;margin:0 auto;padding:40px 24px 80px}
h1{font-size:36px;font-weight:900;letter-spacing:-1px;margin:0 0 8px}h2{font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--ink2);margin:36px 0 12px}
p{color:var(--ink2)}.eyebrow{font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--tartan)}
.card{background:var(--surface1);border:1px solid var(--hairline);border-radius:18px;padding:20px;margin:12px 0}
label{display:block;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--ink2);margin:14px 0 6px}
input,select{width:100%;background:var(--surface2);border:1px solid var(--hairline);border-radius:12px;color:var(--ink);padding:12px 14px;font:inherit}
button{width:100%;margin-top:22px;background:var(--tartan);color:var(--void);border:0;border-radius:999px;padding:18px;font:900 20px/1 -apple-system,system-ui,sans-serif;letter-spacing:.6px;text-transform:uppercase;cursor:pointer}
.big{font-size:56px;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-1px}.mint{color:var(--vault)}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}td,th{padding:10px 6px;border-bottom:1px solid var(--hairline);text-align:left;font-size:15px}th{color:var(--ink2);font-size:12px;letter-spacing:1px;text-transform:uppercase}
td.num,th.num{text-align:right}code{background:var(--surface2);padding:2px 8px;border-radius:6px;font-size:15px}
.wink{color:var(--ink3);font-size:13px;text-align:center;margin-top:40px}a{color:var(--vault)}
`;

function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${css}</style></head><body><main>${body}
<p class="wink">Interest rate: your legs.</p></main></body></html>`;
}

export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function signupPage(share: number, holdDays: number, minPayoutCents: number, requireApproval: boolean): string {
  return layout("Lap creators", `
<span class="eyebrow">Lap · creator program</span>
<h1>Get paid when your video makes someone run.</h1>
<p>Post about Lap, say your code, earn <strong>${Math.round(share * 100)}%</strong> of what every subscriber you bring pays in their first year.
Commissions become payable after ${holdDays} days (refund window) and are paid out monthly once you have ${usd(minPayoutCents)} or more.</p>
<div class="card">
<form method="post" action="/creators">
<label>Name</label><input name="name" required maxlength="80">
<label>Email</label><input name="email" type="email" required maxlength="120">
<label>Handle (without @)</label><input name="handle" required maxlength="40" pattern="[A-Za-z0-9._]+">
<label>Main platform</label><select name="platform"><option>tiktok</option><option>instagram</option><option>youtube</option><option>other</option></select>
<label>PayPal email for payouts</label><input name="payout_email" type="email" required maxlength="120">
<button type="submit">Take the deal</button>
</form></div>
<p>${requireApproval ? "Applications are reviewed within a day." : "You get your code instantly."}
Read <a href="/brief">the brief</a> first — it tells you what to post and what not to.</p>
<h2>Leaderboard</h2><p><a href="/leaderboard">Last 30 days →</a></p>`);
}

export function welcomePage(creator: Creator, link: string, statsUrl: string): string {
  const pending = creator.status === "pending";
  return layout("Your Lap code", `
<span class="eyebrow">${pending ? "application received" : "you're in"}</span>
<h1>@${esc(creator.handle)}</h1>
<div class="card"><label>Your code</label><div class="big">${esc(creator.code)}</div>
<p>Say it in the video, put it in the caption. People type it into Lap on the first screen.</p>
<label>Your link (bio)</label><code>${esc(link)}</code>
<label>Your stats</label><code>${esc(statsUrl)}</code>
<p>Bookmark the stats link — it's your login. Don't share it.</p></div>
${pending ? "<p>Your code starts earning once we approve the application.</p>" : ""}
<p>Now read <a href="/brief">the brief</a>.</p>`);
}

export function statsPage(creator: Creator, b: Balance, clicks30d: number, entries: LedgerEntry[], link: string): string {
  const rows = entries.map((e) => `<tr><td>${new Date(e.created_at).toISOString().slice(0, 10)}</td><td>${esc(e.kind)}</td><td>${esc(e.note)}</td><td class="num ${e.amount_cents >= 0 ? "mint" : ""}">${usd(e.amount_cents)}</td></tr>`).join("");
  return layout(`@${creator.handle} · Lap`, `
<span class="eyebrow">${esc(creator.code)} · ${esc(creator.status)}</span>
<h1>@${esc(creator.handle)}</h1>
<div class="card"><label>Payable</label><div class="big mint">${usd(b.availableCents)}</div>
<p>Pending (in refund hold): ${usd(b.pendingCents)} · Paid out so far: ${usd(b.paidCents)}</p></div>
<div class="card"><table><tr><th>Conversions</th><th class="num">${b.conversions}</th></tr><tr><th>Link clicks · 30d</th><th class="num">${clicks30d}</th></tr></table></div>
<label>Your link</label><code>${esc(link)}</code>
<h2>Submit a post</h2>
<div class="card"><form method="post" action="/me/posts"><input type="hidden" name="token" value="${esc(creator.token)}">
<label>Post URL</label><input name="url" type="url" required>
<label><input type="checkbox" name="disclosed" value="1" style="width:auto;margin-right:8px">This post is marked as an ad / paid partnership</label>
<button type="submit">Submit</button></form></div>
<h2>Ledger</h2>
<div class="card"><table><tr><th>Date</th><th>Type</th><th>Note</th><th class="num">USD</th></tr>${rows || "<tr><td colspan=4>Nothing yet. Post something.</td></tr>"}</table></div>`);
}

export function leaderboardPage(rows: LeaderboardRow[]): string {
  const body = rows.map((r, i) => `<tr><td>${i + 1}</td><td>@${esc(r.handle)} <span style="color:var(--ink3)">${esc(r.platform)}</span></td><td class="num">${r.conversions}</td><td class="num">${r.clicks}</td><td class="num mint">${usd(r.earnedCents)}</td></tr>`).join("");
  return layout("Lap creator leaderboard", `
<span class="eyebrow">last 30 days</span><h1>Leaderboard</h1>
<div class="card"><table><tr><th>#</th><th>Creator</th><th class="num">Subs</th><th class="num">Clicks</th><th class="num">Earned</th></tr>${body || "<tr><td colspan=5>No laps run yet.</td></tr>"}</table></div>
<p><a href="/">Join →</a></p>`);
}

export function briefPage(share: number): string {
  return layout("Lap creator brief", `
<span class="eyebrow">the brief</span>
<h1>What to post.</h1>
<p><strong>The pitch, in one sentence:</strong> my phone won't open TikTok unless I run a lap. Never say more than that. Show it instead.</p>

<h2>The deal</h2>
<div class="card"><p>You earn <strong>${Math.round(share * 100)}%</strong> of net revenue from every subscriber who enters your code, for their first 12 months. Commission appears on your stats page as soon as RevenueCat tells us about the purchase, becomes payable 30 days later, and is paid monthly by PayPal once you've reached the minimum.</p>
<p>Trials pay nothing until they convert. Refunds reverse the commission. Renewals count.</p></div>

<h2>Three formats that work</h2>
<div class="card"><p class="eyebrow">A · The lockout (7–12s, no face needed)</p>
<p>Tap an app → shield says RUN A LAP → cut to legs running, lock screen shows the ring filling → ring completes, <span class="mint">+15 MIN</span> springs in → the app opens → (optional) timer hits 0:00 and it locks mid-video.</p>
<p>Text hook on top. Examples: “my phone makes me run 400m before I can open TikTok” · “the only screen time app that actually worked on me” · “POV: 3 minutes of TikTok left and the shield is coming”.</p></div>
<div class="card"><p class="eyebrow">B · The list (slideshow, 5–7 slides)</p>
<p>Photo + hook (“4 things that fixed my attention span”) → two real habits → “3. I made my apps cost 400 metres” + Lap screenshots → screen-time before/after → “it's called Lap · code ${"<b>YOURCODE</b>"}” on the last slide only.</p></div>
<div class="card"><p class="eyebrow">C · The deal (15–30s, talking)</p>
<p>Story (“I averaged 5 hours a day…”) → problem (“every blocker I tried I just turned off”) → turn (“so I made the price physical”) → 5s of format A → proof → “It's called Lap. Interest rate: your legs.”</p></div>

<h2>Rules</h2>
<div class="card"><p>1. Say your code once, late, as text. Never “link in bio” in the first five seconds.<br>
2. No shame stats, no “you're addicted”. Lap is a game with a stake, not a guilt trip.<br>
3. Re-record for every account — never repost the same file.<br>
4. <strong>Disclose.</strong> In the EU and most other places paid or commissioned content must be marked (#ad, “paid partnership”, “betaald partnerschap”). Make it part of the hook: “I get paid if you sign up. Here's what actually happened.” Undisclosed posts are removed from the program.<br>
5. Submit each post URL on your stats page. Posts get spot-checked.</p></div>

<h2>Signals that a hook is working</h2>
<p>Comments asking “what app?” beat views. If you get them, make five more variants of that exact hook this week.</p>
<p><a href="/">Back →</a></p>`);
}

export { esc, layout };
