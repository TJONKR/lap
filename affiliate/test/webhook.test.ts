import { describe, expect, it } from "vitest";
import { openDatabase } from "../src/db.js";
import type { CommissionRules } from "../src/commission.js";
import type { RevenueCatEvent } from "../src/revenuecat.js";
import { balance, createCreator, getSubscriber, ledgerFor } from "../src/store.js";
import { applyEvent } from "../src/webhook.js";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

const rules: CommissionRules = { share: 0.5, attributionWindowMonths: 12, holdDays: 30, defaultTakehome: 0.85, includeSandbox: false };

function setup() {
  const db = openDatabase(":memory:");
  const creator = createCreator(db, {
    name: "Ana", email: "ana@example.com", handle: "ana.runs", platform: "tiktok", payoutEmail: "ana@pay.me", status: "approved",
  });
  return { db, creator };
}

function event(over: Partial<RevenueCatEvent> & { id: string; type: string }, code?: string): RevenueCatEvent {
  return {
    app_user_id: "user-1",
    environment: "PRODUCTION",
    period_type: "NORMAL",
    price: 24.99,
    takehome_percentage: 0.85,
    product_id: "nl.lerai.lap.pro.annual",
    purchased_at_ms: T0,
    event_timestamp_ms: T0,
    transaction_id: "tx-1",
    ...(code ? { subscriber_attributes: { creator_code: { value: code } } } : {}),
    ...over,
  };
}

describe("applyEvent", () => {
  it("credits 50% of net proceeds on INITIAL_PURCHASE and holds it", () => {
    const { db, creator } = setup();
    const out = applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0);
    // 24.99 * 0.85 = 21.24 net → 10.62 commission
    expect(out).toEqual({ status: "commission", creatorCode: creator.code, amountCents: 1062 });
    const b0 = balance(db, creator.id, T0);
    expect(b0.pendingCents).toBe(1062);
    expect(b0.availableCents).toBe(0);
    const b31 = balance(db, creator.id, T0 + 31 * DAY);
    expect(b31.availableCents).toBe(1062);
    expect(b31.conversions).toBe(1);
  });

  it("is idempotent on event id", () => {
    const { db, creator } = setup();
    applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0);
    expect(applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0)).toEqual({ status: "duplicate" });
    expect(ledgerFor(db, creator.id)).toHaveLength(1);
  });

  it("accepts codes in any case/spacing and ignores unknown codes", () => {
    const { db, creator } = setup();
    const lower = ` ${creator.code.toLowerCase()} `;
    expect(applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, lower), rules, T0).status).toBe("commission");
    expect(applyEvent(db, event({ id: "e2", type: "INITIAL_PURCHASE", app_user_id: "user-2" }, "NOPE99"), rules, T0)).toMatchObject({ status: "ignored" });
  });

  it("attributes first touch: trial start tags the subscriber, later events without attributes still credit", () => {
    const { db, creator } = setup();
    const trial = applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE", period_type: "TRIAL", price: 0 }, creator.code), rules, T0);
    expect(trial).toEqual({ status: "attributed", creatorCode: creator.code });
    expect(getSubscriber(db, "user-1")?.creator_id).toBe(creator.id);

    const conv = applyEvent(db, event({ id: "e2", type: "RENEWAL", is_trial_conversion: true, transaction_id: "tx-2", purchased_at_ms: T0 + 7 * DAY }), rules, T0 + 7 * DAY);
    expect(conv).toMatchObject({ status: "commission", amountCents: 1062 });
    expect(ledgerFor(db, creator.id)[0]?.note).toContain("trial conversion");
  });

  it("does not let a second creator code overwrite the first", () => {
    const { db, creator } = setup();
    const other = createCreator(db, { name: "B", email: "b@x.io", handle: "bob", platform: "tiktok", payoutEmail: "b@x.io", status: "approved" });
    applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0);
    const out = applyEvent(db, event({ id: "e2", type: "RENEWAL", transaction_id: "tx-2" }, other.code), rules, T0 + 365 * DAY);
    expect(out).toMatchObject({ status: "commission", creatorCode: creator.code });
    expect(balance(db, other.id).pendingCents).toBe(0);
  });

  it("stops paying renewals after the attribution window", () => {
    const { db, creator } = setup();
    applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0);
    const inWindow = applyEvent(db, event({ id: "e2", type: "RENEWAL", transaction_id: "tx-2", purchased_at_ms: T0 + 200 * DAY }), rules, T0 + 200 * DAY);
    expect(inWindow.status).toBe("commission");
    const outOfWindow = applyEvent(db, event({ id: "e3", type: "RENEWAL", transaction_id: "tx-3", purchased_at_ms: T0 + 370 * DAY }), rules, T0 + 370 * DAY);
    expect(outOfWindow).toMatchObject({ status: "ignored" });
  });

  it("reverses the matching commission on a refund", () => {
    const { db, creator } = setup();
    applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0);
    const out = applyEvent(db, event({ id: "e2", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", price: null }), rules, T0 + 2 * DAY);
    expect(out).toEqual({ status: "reversal", creatorCode: creator.code, amountCents: -1062 });
    const b = balance(db, creator.id, T0 + 60 * DAY);
    expect(b.availableCents).toBe(0);
    expect(b.pendingCents).toBe(0);
    // a second refund event for the same transaction has nothing left to reverse
    const again = applyEvent(db, event({ id: "e3", type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", price: null }), rules, T0 + 3 * DAY);
    expect(again).toMatchObject({ status: "ignored" });
  });

  it("treats voluntary cancellation as a non-event for the ledger", () => {
    const { db, creator } = setup();
    applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, creator.code), rules, T0);
    const out = applyEvent(db, event({ id: "e2", type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE", price: null }), rules, T0 + DAY);
    expect(out).toEqual({ status: "attributed", creatorCode: creator.code });
    expect(ledgerFor(db, creator.id)).toHaveLength(1);
  });

  it("ignores sandbox purchases by default", () => {
    const { db, creator } = setup();
    const out = applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE", environment: "SANDBOX" }, creator.code), rules, T0);
    expect(out).toMatchObject({ status: "ignored" });
    expect(applyEvent(db, event({ id: "e2", type: "INITIAL_PURCHASE", environment: "SANDBOX", transaction_id: "tx-2" }), { ...rules, includeSandbox: true }, T0).status).toBe("commission");
  });

  it("falls back to the default takehome when the event omits it", () => {
    const { db, creator } = setup();
    const out = applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE", takehome_percentage: null, price: 4.99 }, creator.code), rules, T0);
    // 4.99 * 0.85 = 4.24 → 2.12
    expect(out).toMatchObject({ amountCents: 212 });
  });

  it("does not credit pending (unapproved) creators", () => {
    const { db } = setup();
    const pending = createCreator(db, { name: "P", email: "p@x.io", handle: "pend", platform: "tiktok", payoutEmail: "p@x.io", status: "pending" });
    const out = applyEvent(db, event({ id: "e1", type: "INITIAL_PURCHASE" }, pending.code), rules, T0);
    expect(out).toMatchObject({ status: "ignored" });
  });
});
