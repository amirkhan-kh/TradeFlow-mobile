import * as repo from "./repository.js";
import { ctxOf, message } from "./service.js";
import type { EventName, Payload } from "./types.js";

const BATCH = 20;
const MAX_ATTEMPTS = 8;
const TICK_MS = 5_000;

/** 30s, 1m, 2m … capped at 1h. */
const backoff = (attempt: number) => Math.min(30 * 2 ** attempt, 3600);

async function runOnce() {
  const jobs = await repo.claimDue(BATCH);
  for (const job of jobs) {
    const row = await repo.get(job.integration_id);
    if (!row) continue;
    try {
      const { provider, ctx } = ctxOf(row);
      if (!provider.push) throw new Error(`${provider.name} hodisa qabul qilmaydi`);
      await provider.push(ctx, job.event as EventName, job.payload as Payload);
      await repo.finishJob(job.id);
      await repo.markResult(row.id, null, true);
    } catch (err) {
      const final = job.attempts + 1 >= MAX_ATTEMPTS;
      await repo.failJob(job.id, message(err), final, backoff(job.attempts));
      await repo.markResult(row.id, message(err));
    }
  }
  return jobs.length;
}

/** In-process outbox worker. Safe to run in several API replicas (jobs are leased with SKIP LOCKED). */
export function startWorker() {
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      while ((await runOnce()) === BATCH);
    } catch (err) {
      console.error("integration worker:", err);
    } finally {
      busy = false;
    }
  }, TICK_MS);
  timer.unref();
}
