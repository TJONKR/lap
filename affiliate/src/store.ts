import type { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { now, type Creator, type CreatorStatus, type LedgerEntry, type Payout, type Subscriber } from "./db.js";
import { normalizeCode } from "./revenuecat.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomChars(n: number): string {
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return out;
}

/// Codes are what creators say out loud in videos: short, from their handle, no ambiguous characters.
export function proposeCode(handle: string, attempt: number): string {
  const base = normalizeCode(handle).replace(/[01IO]/g, "").slice(0, 5);
  const suffix = randomChars(attempt === 0 ? 2 : 3);
  return `${base || "LAP"}${suffix}`;
}

export interface NewCreator {
  name: string;
  email: string;
  handle: string;
  platform: string;
  payoutEmail: string;
  status: CreatorStatus;
}

export function createCreator(db: DatabaseSync, input: NewCreator): Creator {
  const insert = db.prepare(
    `INSERT INTO creators (code, token, name, email, handle, platform, payout_email, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = proposeCode(input.handle, attempt);
    if (findCreatorByCode(db, code)) continue;
    const token = randomBytes(24).toString("base64url");
    const result = insert.run(
      code, token, input.name, input.email, input.handle, input.platform, input.payoutEmail, input.status, now(),
    );
    return getCreator(db, Number(result.lastInsertRowid))!;
  }
  throw new Error("could not allocate a unique creator code");
}

export function getCreator(db: DatabaseSync, id: number): Creator | undefined {
  return db.prepare("SELECT * FROM creators WHERE id = ?").get(id) as Creator | undefined;
}

export function findCreatorByCode(db: DatabaseSync, code: string): Creator | undefined {
  return db.prepare("SELECT * FROM creators WHERE code = ?").get(normalizeCode(code)) as Creator | undefined;
}

export function findCreatorByToken(db: DatabaseSync, token: string): Creator | undefined {
  return db.prepare("SELECT * FROM creators WHERE token = ?").get(token) as Creator | undefined;
}

export function listCreators(db: DatabaseSync): Creator[] {
  return db.prepare("SELECT * FROM creators ORDER BY created_at DESC").all() as unknown as Creator[];
}

export function setCreatorStatus(db: DatabaseSync, id: number, status: CreatorStatus): void {
  db.prepare("UPDATE creators SET status = ? WHERE id = ?").run(status, id);
}

export function recordClick(db: DatabaseSync, creatorId: number, referer: string | null, userAgent: string | null): void {
  db.prepare("INSERT INTO clicks (creator_id, referer, user_agent, created_at) VALUES (?, ?, ?, ?)").run(
    creatorId, referer, userAgent, now(),
  );
}

export function getSubscriber(db: DatabaseSync, appUserId: string): Subscriber | undefined {
  return db.prepare("SELECT * FROM subscribers WHERE app_user_id = ?").get(appUserId) as Subscriber | undefined;
}

/// First-touch attribution: once a subscriber is tied to a creator it never changes.
export function upsertSubscriber(
  db: DatabaseSync,
  appUserId: string,
  creatorId: number | null,
  heardFrom: string | null,
): Subscriber {
  const existing = getSubscriber(db, appUserId);
  if (!existing) {
    db.prepare(
      "INSERT INTO subscribers (app_user_id, creator_id, heard_from, first_paid_at, created_at) VALUES (?, ?, ?, NULL, ?)",
    ).run(appUserId, creatorId, heardFrom, now());
    return getSubscriber(db, appUserId)!;
  }
  if (existing.creator_id === null && creatorId !== null) {
    db.prepare("UPDATE subscribers SET creator_id = ? WHERE app_user_id = ?").run(creatorId, appUserId);
  }
  if (existing.heard_from === null && heardFrom !== null) {
    db.prepare("UPDATE subscribers SET heard_from = ? WHERE app_user_id = ?").run(heardFrom, appUserId);
  }
  return getSubscriber(db, appUserId)!;
}

export function markFirstPaid(db: DatabaseSync, appUserId: string, at: number): void {
  db.prepare("UPDATE subscribers SET first_paid_at = ? WHERE app_user_id = ? AND first_paid_at IS NULL").run(at, appUserId);
}

export function hasEvent(db: DatabaseSync, eventId: string): boolean {
  return db.prepare("SELECT 1 FROM events WHERE id = ?").get(eventId) !== undefined;
}

export function recordEvent(db: DatabaseSync, id: string, type: string, appUserId: string | null, payload: unknown): void {
  db.prepare("INSERT INTO events (id, type, app_user_id, received_at, payload) VALUES (?, ?, ?, ?, ?)").run(
    id, type, appUserId, now(), JSON.stringify(payload),
  );
}

export interface NewLedgerEntry {
  creatorId: number;
  kind: LedgerEntry["kind"];
  amountCents: number;
  eventId?: string | null;
  transactionId?: string | null;
  appUserId?: string | null;
  note?: string | null;
  availableAt?: number;
}

export function addLedgerEntry(db: DatabaseSync, e: NewLedgerEntry): LedgerEntry {
  const t = now();
  const result = db.prepare(
    `INSERT INTO ledger (creator_id, kind, amount_cents, event_id, transaction_id, app_user_id, note, available_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    e.creatorId, e.kind, e.amountCents, e.eventId ?? null, e.transactionId ?? null, e.appUserId ?? null,
    e.note ?? null, e.availableAt ?? t, t,
  );
  return db.prepare("SELECT * FROM ledger WHERE id = ?").get(Number(result.lastInsertRowid)) as unknown as LedgerEntry;
}

/// Commission entries for a subscriber that have not been reversed yet, newest first.
export function openCommissions(db: DatabaseSync, appUserId: string, transactionId: string | null): LedgerEntry[] {
  const rows = db.prepare(
    `SELECT c.* FROM ledger c
     WHERE c.kind = 'commission' AND c.app_user_id = ?
       AND NOT EXISTS (SELECT 1 FROM ledger r WHERE r.kind = 'reversal' AND r.transaction_id = c.transaction_id AND r.creator_id = c.creator_id)
     ORDER BY c.created_at DESC`,
  ).all(appUserId) as unknown as LedgerEntry[];
  if (transactionId) {
    const exact = rows.filter((r) => r.transaction_id === transactionId);
    if (exact.length > 0) return exact;
  }
  return rows;
}

export interface Balance {
  pendingCents: number;
  availableCents: number;
  paidCents: number;
  conversions: number;
}

export function balance(db: DatabaseSync, creatorId: number, at = now()): Balance {
  const row = db.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN kind != 'payout' AND available_at >  ? THEN amount_cents END), 0) AS pending,
       COALESCE(SUM(CASE WHEN kind != 'payout' AND available_at <= ? THEN amount_cents END), 0) AS settled,
       COALESCE(SUM(CASE WHEN kind = 'payout' THEN -amount_cents END), 0) AS paid,
       COALESCE(SUM(CASE WHEN kind = 'commission' AND note NOT LIKE 'renewal%' THEN 1 END), 0) AS conversions
     FROM ledger WHERE creator_id = ?`,
  ).get(at, at, creatorId) as { pending: number; settled: number; paid: number; conversions: number };
  return {
    pendingCents: row.pending,
    availableCents: row.settled - row.paid,
    paidCents: row.paid,
    conversions: row.conversions,
  };
}

export function ledgerFor(db: DatabaseSync, creatorId: number, limit = 200): LedgerEntry[] {
  return db.prepare("SELECT * FROM ledger WHERE creator_id = ? ORDER BY created_at DESC LIMIT ?").all(
    creatorId, limit,
  ) as unknown as LedgerEntry[];
}

export function clickCount(db: DatabaseSync, creatorId: number, sinceMs: number): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM clicks WHERE creator_id = ? AND created_at >= ?").get(
    creatorId, sinceMs,
  ) as { n: number };
  return row.n;
}

export interface LeaderboardRow {
  handle: string;
  platform: string;
  code: string;
  conversions: number;
  clicks: number;
  earnedCents: number;
}

export function leaderboard(db: DatabaseSync, sinceMs: number, limit = 25): LeaderboardRow[] {
  return db.prepare(
    `SELECT c.handle, c.platform, c.code,
       (SELECT COUNT(*) FROM ledger l WHERE l.creator_id = c.id AND l.kind = 'commission' AND l.created_at >= ?) AS conversions,
       (SELECT COUNT(*) FROM clicks k WHERE k.creator_id = c.id AND k.created_at >= ?) AS clicks,
       (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger l WHERE l.creator_id = c.id AND l.kind IN ('commission','reversal','bonus') AND l.created_at >= ?) AS earnedCents
     FROM creators c WHERE c.status = 'approved'
     ORDER BY conversions DESC, clicks DESC LIMIT ?`,
  ).all(sinceMs, sinceMs, sinceMs, limit) as unknown as LeaderboardRow[];
}

export function addPost(db: DatabaseSync, creatorId: number, url: string, disclosed: boolean): void {
  db.prepare("INSERT INTO posts (creator_id, url, disclosed, status, created_at) VALUES (?, ?, ?, 'submitted', ?)").run(
    creatorId, url, disclosed ? 1 : 0, now(),
  );
}

export interface PostRow {
  id: number;
  creator_id: number;
  code: string;
  handle: string;
  url: string;
  disclosed: number;
  status: string;
  created_at: number;
}

export function listPosts(db: DatabaseSync, status?: string): PostRow[] {
  const sql = `SELECT p.*, c.code, c.handle FROM posts p JOIN creators c ON c.id = p.creator_id
               ${status ? "WHERE p.status = ?" : ""} ORDER BY p.created_at DESC LIMIT 500`;
  const stmt = db.prepare(sql);
  return (status ? stmt.all(status) : stmt.all()) as unknown as PostRow[];
}

export function setPostStatus(db: DatabaseSync, id: number, status: string): void {
  db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(status, id);
}

export function createPayout(db: DatabaseSync, creatorId: number, amountCents: number): Payout {
  const t = now();
  const result = db.prepare(
    "INSERT INTO payouts (creator_id, amount_cents, status, reference, created_at, paid_at) VALUES (?, ?, 'pending', NULL, ?, NULL)",
  ).run(creatorId, amountCents, t);
  const id = Number(result.lastInsertRowid);
  addLedgerEntry(db, { creatorId, kind: "payout", amountCents: -amountCents, note: `payout #${id}` });
  return getPayout(db, id)!;
}

export function getPayout(db: DatabaseSync, id: number): Payout | undefined {
  return db.prepare("SELECT * FROM payouts WHERE id = ?").get(id) as Payout | undefined;
}

export function listPayouts(db: DatabaseSync, status?: string): (Payout & { payout_email: string; handle: string })[] {
  const sql = `SELECT p.*, c.payout_email, c.handle FROM payouts p JOIN creators c ON c.id = p.creator_id
               ${status ? "WHERE p.status = ?" : ""} ORDER BY p.created_at DESC`;
  const stmt = db.prepare(sql);
  return (status ? stmt.all(status) : stmt.all()) as unknown as (Payout & { payout_email: string; handle: string })[];
}

export function markPayoutPaid(db: DatabaseSync, id: number, reference: string): void {
  db.prepare("UPDATE payouts SET status = 'paid', reference = ?, paid_at = ? WHERE id = ? AND status = 'pending'").run(
    reference, now(), id,
  );
}

/// Cancelling a pending payout returns the money to the creator's available balance.
export function cancelPayout(db: DatabaseSync, id: number): void {
  const payout = getPayout(db, id);
  if (!payout || payout.status !== "pending") return;
  db.prepare("UPDATE payouts SET status = 'cancelled' WHERE id = ?").run(id);
  addLedgerEntry(db, { creatorId: payout.creator_id, kind: "payout", amountCents: payout.amount_cents, note: `payout #${id} cancelled` });
}
