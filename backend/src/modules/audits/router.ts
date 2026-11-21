import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { idParam, notFound, pageOf, parse } from "../../core/http.js";
import * as repo from "./repository.js";
import * as service from "./service.js";

const createSchema = z.object({
  warehouse_id: z.coerce.number().int().positive(),
  auditor_id: z.coerce.number().int().positive().nullish(),
  note: z.string().trim().max(500).optional(),
});

const countsSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.coerce.number().int().positive(),
      counted: z.coerce.number().int().min(0).nullable(),
    }),
  ),
});

export const auditsRouter = Router();

auditsRouter.get("/", async (req, res) => {
  res.json(await repo.list(pageOf(req)));
});

auditsRouter.get("/:id", async (req, res) => {
  const audit = await repo.get(idParam(req));
  if (!audit) throw notFound("Audit topilmadi");
  res.json(audit);
});

auditsRouter.post("/", allow("manager", "auditor"), async (req, res) => {
  res.status(201).json(await service.create(parse(createSchema, req.body), req.user!.id));
});

auditsRouter.put("/:id/items", allow("manager", "auditor"), async (req, res) => {
  await service.saveCounts(idParam(req), parse(countsSchema, req.body).items);
  res.status(204).end();
});

auditsRouter.post("/:id/complete", allow("manager", "auditor"), async (req, res) => {
  await service.complete(idParam(req));
  res.status(204).end();
});

auditsRouter.post("/:id/approve", allow("manager"), async (req, res) => {
  await service.approve(idParam(req), req.user!.id);
  res.status(204).end();
});
