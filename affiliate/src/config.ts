const env = process.env;

function num(name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got ${raw}`);
  return n;
}

export const config = {
  port: num("PORT", 8787),
  databasePath: env.DATABASE_PATH ?? "./data/affiliate.sqlite",
  /// Public origin of this service, used to build creator links (no trailing slash).
  publicOrigin: (env.PUBLIC_ORIGIN ?? "http://localhost:8787").replace(/\/$/, ""),
  /// Bearer token for /admin/* routes.
  adminToken: env.ADMIN_TOKEN ?? "",
  /// Value RevenueCat sends in the Authorization header of every webhook.
  revenueCatWebhookAuth: env.REVENUECAT_WEBHOOK_AUTH ?? "",
  /// e.g. https://apps.apple.com/app/lap/id0000000000
  appStoreUrl: env.APP_STORE_URL ?? "https://apps.apple.com/app/lap/id0000000000",
  /// App Analytics provider token (App Store Connect → Analytics → Campaigns). Optional.
  appStoreProviderToken: env.APP_STORE_PROVIDER_TOKEN ?? "",
  /// Share of net proceeds (after Apple's cut) paid to the creator. 0.5 = 50 %.
  commissionShare: num("COMMISSION_SHARE", 0.5),
  /// Months after a subscriber's first paid transaction during which renewals still earn commission.
  attributionWindowMonths: num("ATTRIBUTION_WINDOW_MONTHS", 12),
  /// Days a commission stays "pending" before it becomes payable (refund window).
  holdDays: num("HOLD_DAYS", 30),
  /// Smallest balance (USD cents) that triggers a payout.
  minPayoutCents: num("MIN_PAYOUT_CENTS", 2000),
  /// Set to "1" to hold new creators in `pending` until an admin approves them.
  requireApproval: env.REQUIRE_APPROVAL === "1",
  includeSandbox: env.INCLUDE_SANDBOX === "1",
  /// Fallback Apple take-home when the webhook omits `takehome_percentage`. 0.85 = Small Business Program.
  defaultTakehome: num("DEFAULT_TAKEHOME", 0.85),
};

export type Config = typeof config;
