import { Router, type Request } from "express";
import { z } from "zod";
import { allow, ROLES } from "../../core/auth.js";
import { idParam, notFound, parse } from "../../core/http.js";
import { ipOf, recent } from "../activity/repository.js";
import * as repo from "./repository.js";
import * as service from "./service.js";
import { password, profileFields } from "./service.js";

const userSchema = z.object({
  ...profileFields,
  role: z.enum(ROLES),
  region: z.string().trim().max(120).optional(),
  monthly_plan: z.coerce.number().min(0).max(1e12).optional(),
});

const createSchema = userSchema.extend({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,40}$/, "Login: 3–40 ta lotin harf, raqam, . _ -"),
  password,
});

const listSchema = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const usersRouter = Router();
const actor = (req: Request) => ({ id: req.user!.id, ip: ipOf(req) });

usersRouter.get("/", async (req, res) => {
  const f = parse(listSchema, req.query);
  res.json({ items: await repo.list({ ...f, activeOnly: req.user!.role !== "admin" }) });
});

usersRouter.get("/stats", allow(), async (_req, res) => {
  res.json({ items: await repo.stats() });
});

usersRouter.get("/:id", allow(), async (req, res) => {
  const user = await repo.findById(idParam(req));
  if (!user) throw notFound("Xodim topilmadi");
  res.json({ ...repo.toPublic(user), activity: await recent(user.id) });
});

usersRouter.post("/", allow(), async (req, res) => {
  res.status(201).json(await service.create(parse(createSchema, req.body), actor(req)));
});

usersRouter.put("/:id", allow(), async (req, res) => {
  res.json(await service.update(idParam(req), parse(userSchema, req.body), actor(req)));
});

usersRouter.post("/:id/password", allow(), async (req, res) => {
  const body = parse(z.object({ password }), req.body);
  res.json(await service.resetPassword(idParam(req), body.password, actor(req)));
});

usersRouter.post("/:id/status", allow(), async (req, res) => {
  const body = parse(z.object({ active: z.boolean() }), req.body);
  res.json(await service.setActive(idParam(req), body.active, actor(req)));
});

usersRouter.post("/:id/sessions/revoke", allow(), async (req, res) => {
  res.json(await service.revokeSessions(idParam(req), actor(req)));
});
