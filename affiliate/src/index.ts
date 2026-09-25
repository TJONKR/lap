import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { openDatabase } from "./db.js";

const db = openDatabase(config.databasePath);
const app = createApp(db, config);

if (!config.adminToken) console.warn("ADMIN_TOKEN not set — /admin/* is disabled");
if (!config.revenueCatWebhookAuth) console.warn("REVENUECAT_WEBHOOK_AUTH not set — webhook is disabled");

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`lap-affiliate listening on http://localhost:${info.port} (public: ${config.publicOrigin})`);
});
