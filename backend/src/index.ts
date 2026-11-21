import { createApp } from "./app.js";
import { config } from "./core/config.js";
import { pool } from "./core/db.js";
import { migrate } from "./core/migrate.js";
import { seed } from "./core/seed.js";
import { startWorker } from "./modules/integrations/worker.js";

async function waitForDb(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database is not reachable");
}

await waitForDb();
await migrate();
await seed();
startWorker();
const server = createApp().listen(config.port, () => console.log(`TradeFlow API on :${config.port}`));
// Must outlive the idle timeout of the reverse proxy in front (Next rewrite, Vercel, Caddy),
// otherwise a reused upstream socket is closed mid-request and the proxy answers 500.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
