import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { idParam, notFound, pageOf, parse } from "../../core/http.js";
import * as repo from "./repository.js";

const schema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().optional(),
  capacity: z.coerce.number().int().min(0).default(0),
  manager_name: z.string().trim().optional(),
  active: z.boolean().default(true),
});

export const warehousesRouter = Router();

warehousesRouter.get("/", async (req, res) => {
  res.json(await repo.list({ ...pageOf(req), active: req.query.active === "true" ? true : undefined }));
});

warehousesRouter.get("/:id", async (req, res) => {
  const item = await repo.get(idParam(req));
  if (!item) throw notFound("Ombor topilmadi");
  res.json(item);
});

warehousesRouter.post("/", allow("manager"), async (req, res) => {
  res.status(201).json(await repo.insert(parse(schema, req.body)));
});

warehousesRouter.put("/:id", allow("manager"), async (req, res) => {
  const item = await repo.update(idParam(req), parse(schema, req.body));
  if (!item) throw notFound("Ombor topilmadi");
  res.json(item);
});
