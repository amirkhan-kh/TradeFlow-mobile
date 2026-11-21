import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { pageOf, parse } from "../../core/http.js";
import * as repo from "./repository.js";
import * as service from "./service.js";

const moveSchema = z.object({
  type: z.enum(["in", "out", "transfer"]),
  warehouse_id: z.coerce.number().int().positive(),
  to_warehouse_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional(),
  idempotency_key: z.string().max(80).optional(),
});

const filter = z.object({
  warehouse_id: z.coerce.number().int().positive().optional(),
  low: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const stockRouter = Router();

stockRouter.get("/", async (req, res) => {
  res.json(await repo.listStock({ ...pageOf(req), ...parse(filter, req.query) }));
});

stockRouter.get("/movements", async (req, res) => {
  res.json(await repo.listMovements({ ...pageOf(req), ...parse(filter, req.query) }));
});

stockRouter.post("/movements", allow("manager"), async (req, res) => {
  res.status(201).json(await service.move(parse(moveSchema, req.body), req.user!.id));
});
