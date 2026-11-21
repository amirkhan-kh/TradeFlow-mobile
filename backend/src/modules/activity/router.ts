import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { pageOf, parse } from "../../core/http.js";
import * as repo from "./repository.js";

const filters = z.object({
  user_id: z.coerce.number().int().positive().optional(),
});

export const activityRouter = Router();

activityRouter.get("/", allow(), async (req, res) => {
  const { page, limit, q, status } = pageOf(req);
  const { user_id } = parse(filters, req.query);
  res.json(await repo.list({ page, limit, group: status, userId: user_id, search: q }));
});
