import type { DatabaseSync } from "node:sqlite";
import type { Payout } from "./db.js";
import { balance, createPayout, listCreators, listPayouts } from "./store.js";

export interface PayoutRun {
  created: Payout[];
  skipped: { creatorId: number; availableCents: number }[];
}

/// Turns every approved creator's payable balance (>= minimum) into a pending payout.
export function runPayouts(db: DatabaseSync, minPayoutCents: number, nowMs = Date.now()): PayoutRun {
  const created: Payout[] = [];
  const skipped: PayoutRun["skipped"] = [];
  db.prepare("BEGIN").run();
  try {
    for (const creator of listCreators(db)) {
      if (creator.status !== "approved") continue;
      const { availableCents } = balance(db, creator.id, nowMs);
      if (availableCents < minPayoutCents) {
        if (availableCents > 0) skipped.push({ creatorId: creator.id, availableCents });
        continue;
      }
      created.push(createPayout(db, creator.id, availableCents));
    }
    db.prepare("COMMIT").run();
  } catch (err) {
    db.prepare("ROLLBACK").run();
    throw err;
  }
  return { created, skipped };
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/// PayPal Payouts bulk-file layout: recipient, amount, currency, reference, note.
export function pendingPayoutsCsv(db: DatabaseSync): string {
  const rows = listPayouts(db, "pending");
  const lines = ["email,amount,currency,payout_id,note"];
  for (const p of rows) {
    lines.push(
      [p.payout_email, (p.amount_cents / 100).toFixed(2), "USD", p.id, `Lap creator commission (@${p.handle})`]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}
