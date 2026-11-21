import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { tx } from "../../core/db.js";
import { idParam, notFound, pageOf, parse } from "../../core/http.js";
import { applyStatus } from "../orders/service.js";
import { assertAssignee } from "../users/service.js";
import * as repo from "./repository.js";

const schema = z.object({
  courier_id: z.coerce.number().int().positive().nullish(),
  vehicle: z.string().trim().max(40).optional(),
  status: z.enum(["pending", "on_route", "delivered", "failed"]).optional(),
  note: z.string().trim().max(500).optional(),
  scheduled_at: z.iso.date().optional(),
});

export const deliveriesRouter = Router();

deliveriesRouter.get("/", async (req, res) => {
  res.json(await repo.list(pageOf(req)));
});

deliveriesRouter.patch("/:id", allow("manager", "courier"), async (req, res) => {
  const id = idParam(req);
  const input = parse(schema, req.body);
  const delivery = await repo.get(id);
  if (!delivery) throw notFound("Yetkazish topilmadi");
  if (input.courier_id && input.courier_id !== delivery.courier_id) await assertAssignee(input.courier_id, ["courier"]);
  if (input.status === "delivered") {
    await tx((db) => applyStatus(db, delivery.order_id, { status: "delivered" }, req.user!.id));
  }
  res.json(await repo.update(id, input));
});
