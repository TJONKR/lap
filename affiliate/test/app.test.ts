import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";
import { openDatabase } from "../src/db.js";
import { listCreators } from "../src/store.js";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

const config: Config = {
  port: 0,
  databasePath: ":memory:",
  publicOrigin: "https://lap.test",
  adminToken: "admin-secret",
  revenueCatWebhookAuth: "Bearer rc-secret",
  appStoreUrl: "https://apps.apple.com/app/lap/id123",
  appStoreProviderToken: "999",
  commissionShare: 0.5,
  attributionWindowMonths: 12,
  holdDays: 30,
  minPayoutCents: 2000,
  requireApproval: false,
  includeSandbox: false,
  defaultTakehome: 0.85,
};

function harness(now = T0) {
  const db = openDatabase(":memory:");
  let clock = now;
  const app = createApp(db, config, () => clock);
  const req = (path: string, init: RequestInit = {}) => app.request(`https://lap.test${path}`, init);
  return { db, app, req, tick: (ms: number) => { clock += ms; } };
}

async function signup(req: ReturnType<typeof harness>["req"], handle = "ana.runs") {
  const form = new URLSearchParams({ name: "Ana", email: "ana@example.com", handle, platform: "tiktok", payout_email: "ana@pay.me" });
  const res = await req("/creators", { method: "POST", body: form, headers: { accept: "application/json" } });
  expect(res.status).toBe(201);
  return (await res.json()) as { code: string; link: string; stats: string; status: string };
}

function rcEvent(id: string, code: string, over: Record<string, unknown> = {}) {
  return {
    api_version: "1.0",
    event: {
      id, type: "INITIAL_PURCHASE", app_user_id: "u1", environment: "PRODUCTION", period_type: "NORMAL",
      price: 24.99, takehome_percentage: 0.85, product_id: "nl.lerai.lap.pro.annual", transaction_id: id,
      purchased_at_ms: T0, event_timestamp_ms: T0,
      subscriber_attributes: { creator_code: { value: code, updated_at_ms: T0 } },
      ...over,
    },
  };
}

describe("creator flow", () => {
  it("signs up, gets a code, link and private stats page", async () => {
    const { req } = harness();
    const c = await signup(req);
    expect(c.code).toMatch(/^[A-Z2-9]{4,8}$/);
    expect(c.link).toBe(`https://lap.test/r/${c.code}`);
    expect(c.status).toBe("approved");
    const stats = await req(new URL(c.stats).pathname);
    expect(stats.status).toBe(200);
    expect(await stats.text()).toContain(c.code);
  });

  it("tracked link records a click and redirects to the App Store with campaign token", async () => {
    const { req, db } = harness();
    const c = await signup(req);
    const res = await req(`/r/${c.code.toLowerCase()}`, { redirect: "manual" });
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin + loc.pathname).toBe("https://apps.apple.com/app/lap/id123");
    expect(loc.searchParams.get("pt")).toBe("999");
    expect(loc.searchParams.get("ct")).toBe(c.code);
    const clicks = db.prepare("SELECT COUNT(*) AS n FROM clicks").get() as { n: number };
    expect(clicks.n).toBe(1);
    const unknown = await req("/r/NOPE", { redirect: "manual" });
    expect(unknown.headers.get("location")).toBe("https://apps.apple.com/app/lap/id123");
  });

  it("validates codes for the app", async () => {
    const { req } = harness();
    const c = await signup(req);
    expect((await req(`/codes/${c.code}`)).status).toBe(200);
    expect((await req("/codes/ZZZZZZ")).status).toBe(404);
  });
});

describe("webhook", () => {
  it("rejects missing/wrong auth", async () => {
    const { req } = harness();
    expect((await req("/webhooks/revenuecat", { method: "POST", body: "{}" })).status).toBe(401);
    expect((await req("/webhooks/revenuecat", { method: "POST", body: "{}", headers: { authorization: "Bearer nope" } })).status).toBe(401);
  });

  it("rejects malformed payloads", async () => {
    const { req } = harness();
    const res = await req("/webhooks/revenuecat", { method: "POST", body: JSON.stringify({ event: { id: 1 } }), headers: { authorization: "Bearer rc-secret" } });
    expect(res.status).toBe(400);
  });

  it("credits the creator and shows it on the leaderboard", async () => {
    const { req } = harness();
    const c = await signup(req);
    const res = await req("/webhooks/revenuecat", {
      method: "POST", body: JSON.stringify(rcEvent("ev1", c.code)), headers: { authorization: "Bearer rc-secret", "content-type": "application/json" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "commission", creatorCode: c.code, amountCents: 1062 });
    const lb = (await (await req("/leaderboard.json")).json()) as { handle: string; conversions: number; earnedCents: number }[];
    expect(lb[0]).toMatchObject({ handle: "ana.runs", conversions: 1, earnedCents: 1062 });
  });
});

describe("admin + payouts", () => {
  const auth = { authorization: "Bearer admin-secret", "content-type": "application/json" };

  it("requires the admin token", async () => {
    const { req } = harness();
    expect((await req("/admin/creators")).status).toBe(401);
    expect((await req("/admin/creators", { headers: auth })).status).toBe(200);
  });

  it("runs payouts only for balances past the hold and above the minimum, exports CSV, marks paid", async () => {
    const { req, tick, db } = harness();
    const a = await signup(req, "ana.runs");
    const b = await signup(req, "bob");
    // Ana: two annuals (21.24 commission) — Bob: one monthly (2.12, under minimum)
    for (const [id, code, over] of [["e1", a.code, {}], ["e2", a.code, { app_user_id: "u2", transaction_id: "e2" }], ["e3", b.code, { app_user_id: "u3", price: 4.99 }]] as const) {
      const res = await req("/webhooks/revenuecat", { method: "POST", body: JSON.stringify(rcEvent(id, code, over)), headers: { authorization: "Bearer rc-secret" } });
      expect(res.status).toBe(200);
    }

    // still in hold: nothing to pay
    let run = await (await req("/admin/payouts/run", { method: "POST", headers: auth })).json() as { created: unknown[]; skipped: unknown[] };
    expect(run.created).toHaveLength(0);

    tick(31 * DAY);
    run = await (await req("/admin/payouts/run", { method: "POST", headers: auth })).json() as { created: { amount_cents: number; id: number }[]; skipped: { availableCents: number }[] };
    expect(run.created).toHaveLength(1);
    expect(run.created[0]?.amount_cents).toBe(2124);
    expect(run.skipped).toEqual([{ creatorId: listCreators(db).find((c) => c.handle === "bob")!.id, availableCents: 212 }]);

    const csv = await (await req("/admin/payouts.csv", { headers: auth })).text();
    expect(csv.split("\n")[0]).toBe("email,amount,currency,payout_id,note");
    expect(csv).toContain("ana@pay.me,21.24,USD,");

    // running again creates nothing (balance moved to payout)
    run = await (await req("/admin/payouts/run", { method: "POST", headers: auth })).json() as { created: unknown[]; skipped: unknown[] };
    expect(run.created).toHaveLength(0);

    const paid = await req("/admin/payouts/1/paid", { method: "POST", headers: auth, body: JSON.stringify({ reference: "PP-123" }) });
    expect(paid.status).toBe(200);
    const stats = await (await req(new URL(a.stats).pathname)).text();
    expect(stats).toContain("Paid out so far: $21.24");
  });

  it("can reject a creator so their code stops earning", async () => {
    const { req, db } = harness();
    const c = await signup(req);
    const id = listCreators(db)[0]!.id;
    const res = await req(`/admin/creators/${id}/status`, { method: "POST", headers: auth, body: JSON.stringify({ status: "rejected" }) });
    expect(res.status).toBe(200);
    const hook = await req("/webhooks/revenuecat", { method: "POST", body: JSON.stringify(rcEvent("e1", c.code)), headers: { authorization: "Bearer rc-secret" } });
    expect(await hook.json()).toMatchObject({ status: "ignored" });
  });
});
