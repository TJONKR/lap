import type { RevenueCatEvent } from "./revenuecat.js";

export interface CommissionRules {
  /// Share of net proceeds paid to the creator, 0..1.
  share: number;
  /// Months after the subscriber's first paid transaction during which events still earn commission.
  attributionWindowMonths: number;
  /// Days before a commission becomes payable.
  holdDays: number;
  /// Used when the event has no `takehome_percentage`.
  defaultTakehome: number;
  /// Whether SANDBOX events earn (test) commission.
  includeSandbox: boolean;
}

export interface CommissionContext {
  /// Epoch ms of the subscriber's first paid transaction, or null if this is the first.
  firstPaidAt: number | null;
  now: number;
}

export interface Commission {
  amountCents: number;
  availableAt: number;
  note: string;
}

const PAID_EVENT_TYPES = new Set(["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"]);

export function isPaidEvent(event: RevenueCatEvent): boolean {
  return PAID_EVENT_TYPES.has(event.type) && (event.price ?? 0) > 0 && event.period_type !== "TRIAL";
}

export function isRefund(event: RevenueCatEvent): boolean {
  return event.type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT";
}

export function monthsBetween(fromMs: number, toMs: number): number {
  const from = new Date(fromMs);
  const to = new Date(toMs);
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

/// Net proceeds in USD cents after the store's cut.
export function netCents(event: RevenueCatEvent, defaultTakehome: number): number {
  const price = event.price ?? 0;
  const takehome = event.takehome_percentage ?? defaultTakehome;
  return Math.round(price * 100 * takehome);
}

/// Returns the commission a paid event earns for its attributed creator, or null when nothing is owed.
export function computeCommission(
  event: RevenueCatEvent,
  rules: CommissionRules,
  ctx: CommissionContext,
): Commission | null {
  if (!isPaidEvent(event)) return null;
  if (event.environment === "SANDBOX" && !rules.includeSandbox) return null;

  const purchasedAt = event.purchased_at_ms ?? event.event_timestamp_ms ?? ctx.now;
  if (ctx.firstPaidAt !== null && monthsBetween(ctx.firstPaidAt, purchasedAt) >= rules.attributionWindowMonths) {
    return null;
  }

  const amountCents = Math.round(netCents(event, rules.defaultTakehome) * rules.share);
  if (amountCents <= 0) return null;

  const label = event.type === "RENEWAL" ? (event.is_trial_conversion ? "trial conversion" : "renewal") : "purchase";
  return {
    amountCents,
    availableAt: ctx.now + rules.holdDays * 86_400_000,
    note: `${label} ${event.product_id ?? ""}`.trim(),
  };
}
