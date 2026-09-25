import type { DatabaseSync } from "node:sqlite";
import { computeCommission, isPaidEvent, isRefund, type CommissionRules } from "./commission.js";
import { attribute, CREATOR_CODE_ATTRIBUTE, HEARD_FROM_ATTRIBUTE, normalizeCode, type RevenueCatEvent } from "./revenuecat.js";
import {
  addLedgerEntry, findCreatorByCode, hasEvent, markFirstPaid, openCommissions, recordEvent, upsertSubscriber,
} from "./store.js";

export type WebhookOutcome =
  | { status: "duplicate" }
  | { status: "ignored"; reason: string }
  | { status: "attributed"; creatorCode: string }
  | { status: "commission"; creatorCode: string; amountCents: number }
  | { status: "reversal"; creatorCode: string; amountCents: number };

/// Processes one RevenueCat event: records it, attributes the subscriber, and writes ledger entries.
export function applyEvent(db: DatabaseSync, event: RevenueCatEvent, rules: CommissionRules, nowMs = Date.now()): WebhookOutcome {
  if (event.type === "TEST") return { status: "ignored", reason: "test event" };
  if (hasEvent(db, event.id)) return { status: "duplicate" };

  const rawCode = attribute(event, CREATOR_CODE_ATTRIBUTE);
  const creatorFromAttr = rawCode ? findCreatorByCode(db, normalizeCode(rawCode)) : undefined;
  const heardFrom = attribute(event, HEARD_FROM_ATTRIBUTE);

  const run = db.prepare("BEGIN");
  run.run();
  try {
    recordEvent(db, event.id, event.type, event.app_user_id, event);
    const subscriber = upsertSubscriber(
      db, event.app_user_id, creatorFromAttr?.status === "approved" ? creatorFromAttr.id : null, heardFrom,
    );

    let outcome: WebhookOutcome;
    const creatorId = subscriber.creator_id;
    const creatorCode = creatorId !== null ? codeFor(db, creatorId) : null;

    if (creatorId === null || creatorCode === null) {
      outcome = { status: "ignored", reason: rawCode ? `unknown or unapproved code ${rawCode}` : "no creator code" };
    } else if (isPaidEvent(event)) {
      const purchasedAt = event.purchased_at_ms ?? event.event_timestamp_ms ?? nowMs;
      const commission = computeCommission(event, rules, { firstPaidAt: subscriber.first_paid_at, now: nowMs });
      markFirstPaid(db, event.app_user_id, purchasedAt);
      if (commission) {
        addLedgerEntry(db, {
          creatorId,
          kind: "commission",
          amountCents: commission.amountCents,
          eventId: event.id,
          transactionId: event.transaction_id ?? null,
          appUserId: event.app_user_id,
          note: commission.note,
          availableAt: commission.availableAt,
        });
        outcome = { status: "commission", creatorCode, amountCents: commission.amountCents };
      } else {
        outcome = { status: "ignored", reason: "paid event outside attribution window, sandbox, or zero value" };
      }
    } else if (isRefund(event)) {
      const open = openCommissions(db, event.app_user_id, event.transaction_id ?? null);
      const target = open[0];
      if (target) {
        addLedgerEntry(db, {
          creatorId: target.creator_id,
          kind: "reversal",
          amountCents: -target.amount_cents,
          eventId: event.id,
          transactionId: target.transaction_id,
          appUserId: event.app_user_id,
          note: `refund of ${target.note ?? "commission"}`,
          availableAt: nowMs,
        });
        outcome = { status: "reversal", creatorCode, amountCents: -target.amount_cents };
      } else {
        outcome = { status: "ignored", reason: "refund with no open commission" };
      }
    } else {
      outcome = { status: "attributed", creatorCode };
    }

    db.prepare("COMMIT").run();
    return outcome;
  } catch (err) {
    db.prepare("ROLLBACK").run();
    throw err;
  }
}

function codeFor(db: DatabaseSync, creatorId: number): string | null {
  const row = db.prepare("SELECT code FROM creators WHERE id = ?").get(creatorId) as { code: string } | undefined;
  return row?.code ?? null;
}
