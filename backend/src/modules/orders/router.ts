import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { idParam, notFound, pageOf, parse } from "../../core/http.js";
import * as repo from "./repository.js";
import * as service from "./service.js";

const createSchema = z.object({
  client_id: z.coerce.number().int().positive(),
  warehouse_id: z.coerce.number().int().positive(),
  agent_id: z.coerce.number().int().positive().nullish(),
  discount_pct: z.coerce.number().min(0).max(50).default(0),
  note: z.string().trim().max(500).optional(),
  items: z
    .array(z.object({ product_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive() }))
    .min(1, "Kamida bitta tovar qo'shing"),
});

const statusSchema = z.object({
  status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]),
  courier_id: z.coerce.number().int().positive().nullish(),
  vehicle: z.string().trim().max(40).optional(),
});

export const ordersRouter = Router();

ordersRouter.get("/", async (req, res) => {
  res.json(await repo.list(pageOf(req)));
});

ordersRouter.get("/:id", async (req, res) => {
  const order = await repo.get(idParam(req));
  if (!order) throw notFound("Buyurtma topilmadi");
  res.json(order);
});

ordersRouter.post("/", allow("manager", "agent"), async (req, res) => {
  res.status(201).json(await service.create(parse(createSchema, req.body), req.user!.id));
});

ordersRouter.post("/:id/status", allow("manager", "courier"), async (req, res) => {
  res.json(await service.changeStatus(idParam(req), parse(statusSchema, req.body), req.user!.id));
});
