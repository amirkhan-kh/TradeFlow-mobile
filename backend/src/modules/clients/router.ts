import { Router } from "express";
import { z } from "zod";
import { allow } from "../../core/auth.js";
import { pool } from "../../core/db.js";
import { HttpError, idParam, notFound, pageOf, parse } from "../../core/http.js";
import { clientPayload, emit } from "../integrations/events.js";
import { activeConfig } from "../integrations/service.js";
import { companyByTin } from "../integrations/providers/didox.js";
import { assertAssignee } from "../users/service.js";
import * as repo from "./repository.js";

const INN = /^(\d{9}|\d{14})$/;

const schema = z.object({
  name: z.string().trim().min(2),
  owner_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  region: z.string().trim().min(2),
  address: z.string().trim().optional(),
  inn: z.string().trim().regex(INN, "INN 9 yoki 14 ta raqam").optional().or(z.literal("").transform(() => undefined)),
  segment: z.enum(["A", "B", "C"]).default("B"),
  agent_id: z.coerce.number().int().positive().nullish(),
  credit_limit: z.coerce.number().min(0).default(0),
});

export const clientsRouter = Router();

clientsRouter.get("/", async (req, res) => {
  res.json(await repo.list(pageOf(req)));
});

clientsRouter.get("/lookup/:inn", allow("manager", "agent"), async (req, res) => {
  const inn = String(req.params.inn);
  if (!INN.test(inn)) throw new HttpError(422, "INN 9 yoki 14 ta raqam");
  const config = await activeConfig("didox");
  if (!config) throw new HttpError(409, "Didox integratsiyasi ulanmagan");
  try {
    res.json(await companyByTin(config, inn));
  } catch (err) {
    throw new HttpError(502, `Soliq bazasidan olinmadi: ${(err as Error).message}`);
  }
});

clientsRouter.get("/:id", async (req, res) => {
  const id = idParam(req);
  const client = await repo.get(id);
  if (!client) throw notFound("Mijoz topilmadi");
  res.json({ ...client, ledger: await repo.ledger(id) });
});

clientsRouter.post("/", allow("manager", "agent"), async (req, res) => {
  const input = parse(schema, req.body);
  await assertAssignee(input.agent_id, ["agent"]);
  const client = await repo.insert(input);
  await emit(pool, "client.created", () => clientPayload(pool, client.id));
  res.status(201).json(client);
});

clientsRouter.put("/:id", allow("manager"), async (req, res) => {
  const id = idParam(req);
  const input = parse(schema, req.body);
  const before = await repo.get(id);
  if (!before) throw notFound("Mijoz topilmadi");
  if (input.agent_id && input.agent_id !== before.agent_id) await assertAssignee(input.agent_id, ["agent"]);
  const item = await repo.update(id, input);
  if (!item) throw notFound("Mijoz topilmadi");
  res.json(item);
});
