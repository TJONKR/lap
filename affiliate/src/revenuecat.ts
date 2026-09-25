import { z } from "zod";

/// Subset of the RevenueCat webhook event body we act on.
/// Field names follow https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
export const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  app_user_id: z.string(),
  original_app_user_id: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  product_id: z.string().optional(),
  period_type: z.string().optional(),
  purchased_at_ms: z.number().optional(),
  expiration_at_ms: z.number().nullable().optional(),
  event_timestamp_ms: z.number().optional(),
  store: z.string().optional(),
  environment: z.string().optional(),
  is_trial_conversion: z.boolean().optional(),
  price: z.number().nullable().optional(),
  price_in_purchased_currency: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  takehome_percentage: z.number().nullable().optional(),
  commission_percentage: z.number().nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  original_transaction_id: z.string().nullable().optional(),
  cancel_reason: z.string().optional(),
  expiration_reason: z.string().optional(),
  subscriber_attributes: z
    .record(z.string(), z.object({ value: z.string().nullable(), updated_at_ms: z.number().optional() }))
    .optional(),
});

export const webhookSchema = z.object({
  api_version: z.string().optional(),
  event: eventSchema,
});

export type RevenueCatEvent = z.infer<typeof eventSchema>;

export const CREATOR_CODE_ATTRIBUTE = "creator_code";
export const HEARD_FROM_ATTRIBUTE = "heard_from";

export function attribute(event: RevenueCatEvent, key: string): string | null {
  const v = event.subscriber_attributes?.[key]?.value;
  if (v === undefined || v === null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
