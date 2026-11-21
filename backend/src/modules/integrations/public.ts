import express, { Router, type Request } from "express";
import { z } from "zod";
import { tx } from "../../core/db.js";
import { notFound, parse } from "../../core/http.js";
import { upsertBySku } from "../products/repository.js";
import { isDataset, readDataset, toCsv } from "./feeds.js";
import { setStockBySku } from "./imports.js";
import { handleClick } from "./providers/click.js";
import { handlePayme } from "./providers/payme.js";
import { isSpot2dFile, spot2dCsv } from "./providers/spot2d.js";
import { recordCall } from "./providers/telephony.js";
import * as repo from "./repository.js";
import { ctxOf } from "./service.js";

/** Token-authenticated inbound URLs: /api/v1/public/integrations/:token/... */
export const integrationsPublicRouter = Router({ mergeParams: true });
integrationsPublicRouter.use(express.urlencoded({ extended: false, limit: "1mb" }));

const FEED_PROVIDERS = ["powerbi", "google_sheets", "onec"];

async function integration(req: Request, providers: string[]) {
  const token = z.string().regex(/^[a-f0-9]{48}$/).safeParse(req.params.token);
  const row = token.success ? await repo.byToken(token.data) : undefined;
  if (!row || !providers.includes(row.provider)) throw notFound("Integratsiya topilmadi yoki o'chirilgan");
  return row;
}

const range = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional(), format: z.enum(["json", "csv"]).optional() });

integrationsPublicRouter.get("/:token/feed/:dataset", async (req, res) => {
  const row = await integration(req, FEED_PROVIDERS);
  if (!isDataset(req.params.dataset)) throw notFound("Bunday ma'lumotlar to'plami yo'q");
  const q = parse(range, req.query);
  const rows = await readDataset(req.params.dataset, q);
  await repo.markResult(row.id, null, true);
  if ((q.format ?? (row.provider === "google_sheets" ? "csv" : "json")) === "csv") {
    res.type("text/csv; charset=utf-8").send("\uFEFF" + toCsv(rows));
  } else {
    res.json(rows);
  }
});

integrationsPublicRouter.get("/:token/spot2d/:file", async (req, res) => {
  const row = await integration(req, ["spot2d"]);
  if (!isSpot2dFile(req.params.file)) throw notFound("Bunday fayl yo'q");
  const csv = await spot2dCsv(ctxOf(row).ctx.config, req.params.file);
  await repo.markResult(row.id, null, true);
  res.type("text/csv; charset=utf-8").attachment(req.params.file).send(csv);
});

const productsSchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(60),
        name: z.string().trim().min(1).max(200),
        category: z.string().trim().max(80).optional(),
        unit: z.string().trim().max(20).optional(),
        price: z.coerce.number().min(0),
        cost: z.coerce.number().min(0).optional(),
        weight_kg: z.coerce.number().min(0).optional(),
        active: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(10_000),
});

integrationsPublicRouter.post("/:token/1c/products", async (req, res) => {
  const row = await integration(req, ["onec"]);
  const { items } = parse(productsSchema, req.body);
  const result = await tx((db) => upsertBySku(db, items));
  await repo.markResult(row.id, null, true);
  res.json(result);
});

const stockSchema = z.object({
  warehouse_code: z.string().trim().min(1),
  items: z.array(z.object({ sku: z.string().trim().min(1), quantity: z.coerce.number().int().min(0) })).min(1).max(10_000),
});

/** Sets absolute quantities from 1C; each difference is an `adjust` movement referencing "1C". */
integrationsPublicRouter.post("/:token/1c/stock", async (req, res) => {
  const row = await integration(req, ["onec"]);
  const input = parse(stockSchema, req.body);
  const result = await tx((db) => setStockBySku(db, input.warehouse_code, input.items, "1C", row.name));
  await repo.markResult(row.id, null, true);
  res.json(result);
});

integrationsPublicRouter.post("/:token/payme", async (req, res) => {
  const row = await integration(req, ["payme"]);
  res.json(await handlePayme(row, req.headers.authorization, req.body));
});

integrationsPublicRouter.post("/:token/click/:step", async (req, res) => {
  const row = await integration(req, ["click"]);
  const step = z.enum(["prepare", "complete"]).safeParse(req.params.step);
  if (!step.success) throw notFound("Topilmadi");
  const body = Object.fromEntries(Object.entries(req.body ?? {}).map(([k, v]) => [k, v === undefined || v === null ? undefined : String(v)]));
  res.json(await handleClick(row, step.data, body));
});

integrationsPublicRouter.post("/:token/call", async (req, res) => {
  const row = await integration(req, ["telephony"]);
  const call = await recordCall(row.id, row.config.create_leads !== "no", req.body);
  await repo.markResult(row.id, null, true);
  res.status(201).json(call);
});
