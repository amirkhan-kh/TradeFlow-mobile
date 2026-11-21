import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "../../core/auth.js";
import { pool, tx, type Db } from "../../core/db.js";
import { conflict, HttpError, notFound } from "../../core/http.js";
import { log } from "../activity/repository.js";
import * as repo from "./repository.js";
import type { UserInput } from "./repository.js";

interface Actor {
  id: number;
  ip: string | null;
}

export const hash = (password: string) => bcrypt.hash(password, 10);

export const password = z
  .string()
  .min(8, "Parol kamida 8 belgi")
  .max(72)
  .regex(/[A-Za-z]/, "Parolda harf bo'lishi kerak")
  .regex(/\d/, "Parolda raqam bo'lishi kerak");

export const profileFields = {
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(40).optional(),
  email: z.email("Email noto'g'ri").optional().or(z.literal("").transform(() => undefined)),
};

/** Agents, couriers and auditors are assigned by id: it must be an active user in one of the expected roles. */
export async function assertAssignee(id: number | null | undefined, roles: Role[], db: Db = pool) {
  if (id == null) return;
  const user = await repo.findById(id, db);
  if (!user?.active || !roles.includes(user.role)) throw new HttpError(422, "Xodim topilmadi yoki bu vazifaga mos emas");
}

function guardLastAdmin(admins: number[], userId: number) {
  if (admins.length === 1 && admins[0] === userId) throw conflict("Kamida bitta faol administrator qolishi kerak");
}

export function create(input: UserInput & { username: string; password: string }, actor: Actor) {
  return tx(async (db) => {
    const { password, ...data } = input;
    const user = await repo.insert(db, { ...data, password_hash: await hash(password) });
    await log(db, { actor_id: actor.id, action: "user.created", target_user_id: user.id, details: { role: user.role, username: user.username }, ip: actor.ip });
    return repo.toPublic(user);
  });
}

export function update(id: number, input: UserInput, actor: Actor) {
  return tx(async (db) => {
    const admins = await repo.lockActiveAdmins(db);
    const before = await repo.findById(id, db, true);
    if (!before) throw notFound("Xodim topilmadi");
    if (before.role !== input.role) {
      if (id === actor.id) throw conflict("O'z rolingizni o'zgartira olmaysiz");
      if (before.role === "admin") guardLastAdmin(admins, id);
    }
    const after = await repo.update(db, id, input);
    const changed = (["full_name", "phone", "email", "region", "monthly_plan"] as const).filter((k) => String(before[k] ?? "") !== String(after[k] ?? ""));
    if (before.role !== after.role) {
      await repo.revokeSessions(db, id);
      await log(db, { actor_id: actor.id, action: "user.role_changed", target_user_id: id, details: { from: before.role, to: after.role }, ip: actor.ip });
    }
    if (changed.length) await log(db, { actor_id: actor.id, action: "user.updated", target_user_id: id, details: { fields: changed }, ip: actor.ip });
    return repo.toPublic(after);
  });
}

export function resetPassword(id: number, password: string, actor: Actor) {
  return tx(async (db) => {
    const user = await repo.setPassword(db, id, await hash(password));
    if (!user) throw notFound("Xodim topilmadi");
    await log(db, { actor_id: actor.id, action: "user.password_reset", target_user_id: id, ip: actor.ip });
    return repo.toPublic(user);
  });
}

export function setActive(id: number, active: boolean, actor: Actor) {
  return tx(async (db) => {
    const admins = await repo.lockActiveAdmins(db);
    const before = await repo.findById(id, db, true);
    if (!before) throw notFound("Xodim topilmadi");
    if (!active && id === actor.id) throw conflict("O'zingizni bloklay olmaysiz");
    if (!active && before.role === "admin") guardLastAdmin(admins, id);
    if (before.active === active) return repo.toPublic(before);
    const user = await repo.setActive(db, id, active);
    await log(db, { actor_id: actor.id, action: active ? "user.activated" : "user.deactivated", target_user_id: id, ip: actor.ip });
    return repo.toPublic(user);
  });
}

export function revokeSessions(id: number, actor: Actor) {
  return tx(async (db) => {
    const user = await repo.revokeSessions(db, id);
    if (!user) throw notFound("Xodim topilmadi");
    await log(db, { actor_id: actor.id, action: "user.sessions_revoked", target_user_id: id, ip: actor.ip });
    return repo.toPublic(user);
  });
}
