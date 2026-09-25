import { timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { z } from "zod";
import type { Config } from "./config.js";
import type { CommissionRules } from "./commission.js";
import { pendingPayoutsCsv, runPayouts } from "./payouts.js";
import { briefPage, leaderboardPage, signupPage, statsPage, welcomePage } from "./pages.js";
import { normalizeCode, webhookSchema } from "./revenuecat.js";
import {
  addPost, balance, cancelPayout, clickCount, createCreator, findCreatorByCode, findCreatorByToken, getCreator,
  leaderboard, ledgerFor, listCreators, listPayouts, listPosts, markPayoutPaid, recordClick, setCreatorStatus,
  setPostStatus,
} from "./store.js";
import { applyEvent } from "./webhook.js";

const DAY = 86_400_000;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function bearer(header: string | undefined): string {
  return header?.replace(/^Bearer\s+/i, "") ?? "";
}

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  handle: z.string().trim().regex(/^[A-Za-z0-9._]+$/).max(40),
  platform: z.enum(["tiktok", "instagram", "youtube", "other"]),
  payout_email: z.string().trim().email().max(120),
});

const postSchema = z.object({
  token: z.string().min(1),
  url: z.string().trim().url().max(500),
  disclosed: z.string().optional(),
});

const statusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });
const postStatusSchema = z.object({ status: z.enum(["submitted", "ok", "flagged", "removed"]) });
const paidSchema = z.object({ reference: z.string().trim().min(1).max(120) });

export function createApp(db: DatabaseSync, config: Config, nowFn: () => number = Date.now) {
  const rules: CommissionRules = {
    share: config.commissionShare,
    attributionWindowMonths: config.attributionWindowMonths,
    holdDays: config.holdDays,
    defaultTakehome: config.defaultTakehome,
    includeSandbox: config.includeSandbox,
  };
  const linkFor = (code: string) => `${config.publicOrigin}/r/${code}`;
  const statsFor = (token: string) => `${config.publicOrigin}/me/${token}`;

  const app = new Hono();

  app.get("/healthz", (c) => c.json({ ok: true }));

  // ── creator-facing ────────────────────────────────────────────────────────
  app.get("/", (c) => c.html(signupPage(config.commissionShare, config.holdDays, config.minPayoutCents, config.requireApproval)));
  app.get("/brief", (c) => c.html(briefPage(config.commissionShare)));
  app.get("/leaderboard", (c) => c.html(leaderboardPage(leaderboard(db, nowFn() - 30 * DAY))));
  app.get("/leaderboard.json", (c) => c.json(leaderboard(db, nowFn() - 30 * DAY)));

  app.post("/creators", async (c) => {
    const body = signupSchema.safeParse(await c.req.parseBody());
    if (!body.success) return c.text("Invalid form", 400);
    const creator = createCreator(db, {
      ...body.data,
      payoutEmail: body.data.payout_email,
      status: config.requireApproval ? "pending" : "approved",
    });
    const wantsJson = c.req.header("accept")?.includes("application/json");
    if (wantsJson) return c.json({ code: creator.code, link: linkFor(creator.code), stats: statsFor(creator.token), status: creator.status }, 201);
    return c.html(welcomePage(creator, linkFor(creator.code), statsFor(creator.token)), 201);
  });

  app.get("/me/:token", (c) => {
    const creator = findCreatorByToken(db, c.req.param("token"));
    if (!creator) return c.text("Not found", 404);
    return c.html(statsPage(creator, balance(db, creator.id, nowFn()), clickCount(db, creator.id, nowFn() - 30 * DAY), ledgerFor(db, creator.id), linkFor(creator.code)));
  });

  app.post("/me/posts", async (c) => {
    const body = postSchema.safeParse(await c.req.parseBody());
    if (!body.success) return c.text("Invalid form", 400);
    const creator = findCreatorByToken(db, body.data.token);
    if (!creator) return c.text("Not found", 404);
    addPost(db, creator.id, body.data.url, body.data.disclosed === "1");
    return c.redirect(`/me/${creator.token}`, 303);
  });

  // ── tracked link → App Store ──────────────────────────────────────────────
  app.get("/r/:code", (c) => {
    const code = normalizeCode(c.req.param("code"));
    const creator = findCreatorByCode(db, code);
    if (!creator) return c.redirect(config.appStoreUrl, 302);
    recordClick(db, creator.id, c.req.header("referer") ?? null, c.req.header("user-agent") ?? null);
    const url = new URL(config.appStoreUrl);
    if (config.appStoreProviderToken) url.searchParams.set("pt", config.appStoreProviderToken);
    url.searchParams.set("ct", code);
    return c.redirect(url.toString(), 302);
  });

  // ── in-app code check (no auth; only reveals that a code exists) ──────────
  app.get("/codes/:code", (c) => {
    const creator = findCreatorByCode(db, normalizeCode(c.req.param("code")));
    if (!creator || creator.status !== "approved") return c.json({ valid: false }, 404);
    return c.json({ valid: true, handle: creator.handle });
  });

  // ── RevenueCat webhook ────────────────────────────────────────────────────
  app.post("/webhooks/revenuecat", async (c) => {
    if (!config.revenueCatWebhookAuth) return c.text("Webhook auth not configured", 503);
    if (!safeEqual(c.req.header("authorization") ?? "", config.revenueCatWebhookAuth)) return c.text("Unauthorized", 401);
    const parsed = webhookSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Bad payload", issues: parsed.error.issues }, 400);
    const outcome = applyEvent(db, parsed.data.event, rules, nowFn());
    return c.json(outcome);
  });

  // ── admin ─────────────────────────────────────────────────────────────────
  const admin = new Hono();
  admin.use("*", async (c, next) => {
    if (!config.adminToken) return c.text("Admin token not configured", 503);
    if (!safeEqual(bearer(c.req.header("authorization")), config.adminToken)) return c.text("Unauthorized", 401);
    await next();
  });

  admin.get("/creators", (c) => c.json(listCreators(db).map((cr) => ({ ...cr, token: undefined, balance: balance(db, cr.id, nowFn()) }))));
  admin.get("/creators/:id", (c) => {
    const creator = getCreator(db, Number(c.req.param("id")));
    if (!creator) return c.text("Not found", 404);
    return c.json({ ...creator, balance: balance(db, creator.id, nowFn()), ledger: ledgerFor(db, creator.id, 500), link: linkFor(creator.code), stats: statsFor(creator.token) });
  });
  admin.post("/creators/:id/status", async (c) => {
    const body = statusSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.text("Bad payload", 400);
    const id = Number(c.req.param("id"));
    if (!getCreator(db, id)) return c.text("Not found", 404);
    setCreatorStatus(db, id, body.data.status);
    return c.json(getCreator(db, id));
  });

  admin.get("/posts", (c) => c.json(listPosts(db, c.req.query("status") ?? "submitted")));
  admin.post("/posts/:id/status", async (c) => {
    const body = postStatusSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.text("Bad payload", 400);
    setPostStatus(db, Number(c.req.param("id")), body.data.status);
    return c.json({ ok: true });
  });

  admin.post("/payouts/run", (c) => c.json(runPayouts(db, config.minPayoutCents, nowFn())));
  admin.get("/payouts", (c) => c.json(listPayouts(db, c.req.query("status") ?? "pending")));
  admin.get("/payouts.csv", (c) => {
    c.header("content-type", "text/csv; charset=utf-8");
    c.header("content-disposition", `attachment; filename="lap-payouts-${new Date(nowFn()).toISOString().slice(0, 10)}.csv"`);
    return c.body(pendingPayoutsCsv(db));
  });
  admin.post("/payouts/:id/paid", async (c) => {
    const body = paidSchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.text("Bad payload", 400);
    markPayoutPaid(db, Number(c.req.param("id")), body.data.reference);
    return c.json({ ok: true });
  });
  admin.post("/payouts/:id/cancel", (c) => {
    cancelPayout(db, Number(c.req.param("id")));
    return c.json({ ok: true });
  });

  app.route("/admin", admin);
  return app;
}

export type App = ReturnType<typeof createApp>;
