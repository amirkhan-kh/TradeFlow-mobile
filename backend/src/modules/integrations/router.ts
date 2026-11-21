import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { HttpError, idParam, notFound, parse } from "../../core/http.js";
import { langOf, translateKnown } from "../../core/i18n.js";
import { DATASET_NAMES, datasetLabel } from "./feeds.js";
import { describe, localizer, PROVIDERS } from "./catalog.js";
import * as repo from "./repository.js";
import * as service from "./service.js";
import { EVENTS } from "./types.js";

const base = {
  name: z.string().trim().min(2).max(80),
  config: z.record(z.string(), z.coerce.string().max(4000)).default({}),
  events: z.array(z.string()).max(20).default([]),
  active: z.boolean().default(true),
};
const createSchema = z.object({ provider: z.string().min(2).max(40), ...base });
const updateSchema = z.object(base);

/** Admin only: credentials and inbound tokens live here. */
export const integrationsRouter = Router();
integrationsRouter.use(allow());

integrationsRouter.get("/providers", (req, res) => {
  const lang = langOf(req);
  const tx = localizer(lang);
  res.json({
    providers: PROVIDERS.map((p) => describe(p, lang)),
    events: Object.fromEntries(Object.entries(EVENTS).map(([k, v]) => [k, tx(v)])),
    datasets: DATASET_NAMES.map((d) => ({ key: d, label: tx(datasetLabel(d)) })),
  });
});

integrationsRouter.get("/", async (req, res) => {
  const lang = langOf(req);
  res.json({ items: (await repo.list()).map((r) => ({ ...service.present(r, lang), pending_jobs: r.pending_jobs, failed_jobs: r.failed_jobs, sent_today: r.sent_today })) });
});

integrationsRouter.post("/", async (req, res) => {
  res.status(201).json(await service.create(parse(createSchema, req.body), langOf(req)));
});

integrationsRouter.put("/:id", async (req, res) => {
  res.json(await service.update(idParam(req), parse(updateSchema, req.body), langOf(req)));
});

integrationsRouter.delete("/:id", async (req, res) => {
  if (!(await repo.remove(idParam(req)))) throw notFound("Integratsiya topilmadi");
  res.status(204).end();
});

integrationsRouter.post("/:id/test", async (req, res) => {
  res.json(await service.test(idParam(req), langOf(req)));
});

integrationsRouter.post("/:id/sync", async (req, res) => {
  res.json(await service.sync(idParam(req), langOf(req)));
});

integrationsRouter.post("/:id/token", async (req, res) => {
  res.json(await service.rotateToken(idParam(req), langOf(req)));
});

integrationsRouter.get("/:id/jobs", async (req, res) => {
  const lang = langOf(req);
  res.json({ items: (await repo.jobs(idParam(req))).map((j) => ({ ...j, last_error: j.last_error && translateKnown(lang, j.last_error) })) });
});

integrationsRouter.post("/:id/jobs/:jobId/retry", async (req, res) => {
  const jobId = z.coerce.number().int().positive().parse(req.params.jobId);
  if (!(await repo.retryJob(idParam(req), jobId))) throw new HttpError(409, "Faqat muvaffaqiyatsiz vazifani qayta yuborish mumkin");
  res.status(204).end();
});

integrationsRouter.get("/:id/calls", async (req, res) => {
  res.json({ items: await repo.calls(idParam(req)) });
});
