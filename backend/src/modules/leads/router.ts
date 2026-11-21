import { Router } from "express";
import { z } from "zod";
import { pool, tx } from "../../core/db.js";
import { idParam, notFound, pageOf, parse } from "../../core/http.js";
import { emit, leadPayload } from "../integrations/events.js";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
});

const statusSchema = z.object({ status: z.enum(["new", "contacted", "won", "lost"]) });

/** Public: demo requests from the landing page. */
export const leadsPublicRouter = Router();

leadsPublicRouter.post("/", async (req, res) => {
  const l = parse(createSchema, req.body);
  const lead = await tx(async (db) => {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO leads (name, phone, company, message) VALUES ($1,$2,$3,$4) RETURNING id`,
      [l.name, l.phone, l.company ?? null, l.message ?? null],
    );
    await emit(db, "lead.created", () => leadPayload(db, rows[0].id));
    return rows[0];
  });
  res.status(201).json(lead);
});

export const leadsRouter = Router();

leadsRouter.get("/", async (req, res) => {
  const { page, limit, status } = pageOf(req);
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT * FROM leads WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [status || null, limit, (page - 1) * limit],
    ),
    pool.query(`SELECT COUNT(*) FROM leads WHERE ($1::text IS NULL OR status=$1)`, [status || null]),
  ]);
  res.json({ items: items.rows, total: count.rows[0].count, page, limit });
});

leadsRouter.patch("/:id", async (req, res) => {
  const { rows } = await pool.query(`UPDATE leads SET status=$2 WHERE id=$1 RETURNING *`, [
    idParam(req),
    parse(statusSchema, req.body).status,
  ]);
  if (!rows[0]) throw notFound("Lid topilmadi");
  res.json(rows[0]);
});
