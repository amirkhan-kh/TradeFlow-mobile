import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE, requireAuth, signToken } from "../../core/auth.js";
import { config } from "../../core/config.js";
import { pool, tx } from "../../core/db.js";
import { conflict, HttpError, parse } from "../../core/http.js";
import { ipOf, log, recent } from "../activity/repository.js";
import * as users from "../users/repository.js";
import { hash, password, profileFields } from "../users/service.js";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
/** Failed logins per username+IP; in-memory is enough for a single API process. */
const fails = new Map<string, { count: number; until: number }>();

/** Sets the session cookie; the native app (`X-Client: mobile`) has no cookie jar, so it also gets the same JWT in the body. */
function setSession(req: Request, res: Response, user: users.UserRow): { token?: string } {
  const token = signToken({ id: user.id, username: user.username, role: user.role, v: user.token_version });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    maxAge: 7 * 24 * 3600 * 1000,
    path: "/",
  });
  return req.get("x-client") === "mobile" ? { token } : {};
}

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password: pass } = parse(loginSchema, req.body);
  const key = `${username.toLowerCase()}|${ipOf(req)}`;
  const f = fails.get(key);
  if (f && f.count >= MAX_FAILS && f.until > Date.now()) {
    throw new HttpError(429, `Ko'p noto'g'ri urinish. ${Math.ceil((f.until - Date.now()) / 60_000)} daqiqadan keyin qayta urinib ko'ring`);
  }
  const user = await users.findByUsername(username);
  if (!user || !(await bcrypt.compare(pass, user.password_hash))) {
    const count = f && f.until > Date.now() ? f.count + 1 : 1;
    fails.set(key, { count, until: Date.now() + LOCK_MS });
    if (user) await log(pool, { actor_id: null, action: count >= MAX_FAILS ? "auth.locked" : "auth.login_failed", target_user_id: user.id, details: { attempt: count }, ip: ipOf(req) });
    throw new HttpError(401, "Login yoki parol noto'g'ri");
  }
  if (!user.active) throw new HttpError(403, "Hisobingiz bloklangan — administratorga murojaat qiling");
  fails.delete(key);
  await users.touchLogin(user.id);
  await log(pool, { actor_id: user.id, action: "auth.login", ip: ipOf(req), details: { agent: String(req.headers["user-agent"] ?? "").slice(0, 160) } });
  res.json({ user: users.toPublic(user), ...setSession(req, res, user) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await users.findById(req.user!.id);
  if (!user) throw new HttpError(401, "Foydalanuvchi topilmadi");
  res.json({ user: users.toPublic(user) });
});

authRouter.put("/me", requireAuth, async (req, res) => {
  const input = parse(z.object(profileFields), req.body);
  const user = await tx(async (db) => {
    const u = await users.updateProfile(db, req.user!.id, input);
    await log(db, { actor_id: u.id, action: "profile.updated", ip: ipOf(req) });
    return u;
  });
  res.json({ user: users.toPublic(user) });
});

authRouter.post("/me/password", requireAuth, async (req, res) => {
  const body = parse(z.object({ current_password: z.string().min(1), new_password: password }), req.body);
  const current = await users.findById(req.user!.id);
  if (!current || !(await bcrypt.compare(body.current_password, current.password_hash))) throw new HttpError(422, "Joriy parol noto'g'ri");
  if (body.current_password === body.new_password) throw conflict("Yangi parol joriy paroldan farq qilishi kerak");
  const user = await tx(async (db) => {
    const u = await users.setPassword(db, current.id, await hash(body.new_password));
    await log(db, { actor_id: u.id, action: "profile.password_changed", ip: ipOf(req) });
    return u;
  });
  res.json({ user: users.toPublic(user), ...setSession(req, res, user) });
});

authRouter.get("/me/activity", requireAuth, async (req, res) => {
  res.json({ items: await recent(req.user!.id, 30) });
});
