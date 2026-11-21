import type { ErrorRequestHandler, Request } from "express";
import { z, ZodError } from "zod";
import { langOf, translate } from "./i18n.js";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what = "Topilmadi") => new HttpError(404, what);
export const conflict = (msg: string) => new HttpError(409, msg);

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().trim().optional(),
  status: z.string().trim().optional(),
});
export type PageQuery = z.infer<typeof pageQuery>;

export function pageOf(req: Request): PageQuery {
  return pageQuery.parse(req.query);
}

export const idParam = (req: Request) => z.coerce.number().int().positive().parse(req.params.id);

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const lang = langOf(req);
  res.setHeader("Content-Language", lang);
  if (err instanceof ZodError) {
    res.status(422).json({ error: translate(lang, "Ma'lumotlar noto'g'ri"), issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: translate(lang, err.message) });
    return;
  }
  if (err?.code === "23505") {
    res.status(409).json({ error: translate(lang, "Bunday yozuv allaqachon mavjud") });
    return;
  }
  if (err?.code === "23503") {
    res.status(422).json({ error: translate(lang, "Bog'langan yozuv topilmadi") });
    return;
  }
  console.error(err);
  res.status(500).json({ error: translate(lang, "Server xatosi") });
};
