import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./http.js";

export const ROLES = ["admin", "manager", "agent", "courier", "auditor"] as const;
export type Role = (typeof ROLES)[number];
export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export const COOKIE = "tf_token";

/** `v` = users.token_version; bumping it revokes every issued token of that user. */
export function signToken(user: AuthUser & { v: number }): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

/** Role and active flag come from the DB on every request, so admin changes apply immediately. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!token) throw new HttpError(401, "Avtorizatsiya talab qilinadi");
  let claims: AuthUser & { v?: number };
  try {
    claims = jwt.verify(token, config.jwtSecret) as AuthUser & { v?: number };
  } catch {
    throw new HttpError(401, "Sessiya muddati tugagan");
  }
  const { rows } = await pool.query<AuthUser & { active: boolean; token_version: number }>(
    `SELECT id, username, role, active, token_version FROM users WHERE id = $1`,
    [claims.id],
  );
  const u = rows[0];
  if (!u || !u.active || u.token_version !== (claims.v ?? 0)) throw new HttpError(401, "Sessiya bekor qilingan — qaytadan kiring");
  req.user = { id: u.id, username: u.username, role: u.role };
  next();
};

export const allow =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || (req.user.role !== "admin" && !roles.includes(req.user.role))) {
      throw new HttpError(403, "Ruxsat yo'q");
    }
    next();
  };
