import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { idParam, notFound, pageOf, parse } from "../../core/http.js";
import * as repo from "./repository.js";

const schema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  unit: z.string().trim().default("dona"),
  weight_kg: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0).default(0),
  min_stock: z.coerce.number().int().min(0).default(0),
  expires_at: z.iso.date().nullish(),
  active: z.boolean().default(true),
  ikpu: z.string().trim().regex(/^\d{17}$/, "IKPU 17 ta raqam").optional().or(z.literal("").transform(() => undefined)),
  package_code: z.string().trim().max(20).optional(),
  vat_rate: z.coerce.number().min(0).max(100).default(12),
});

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  res.json(await repo.list({ ...pageOf(req), active: req.query.active === "true" ? true : undefined }));
});

productsRouter.get("/categories", async (_req, res) => {
  res.json({ items: await repo.categories() });
});

productsRouter.post("/", allow("manager"), async (req, res) => {
  res.status(201).json(await repo.insert(parse(schema, req.body)));
});

productsRouter.put("/:id", allow("manager"), async (req, res) => {
  const item = await repo.update(idParam(req), parse(schema, req.body));
  if (!item) throw notFound("Tovar topilmadi");
  res.json(item);
});
