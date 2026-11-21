import { conflict, HttpError, notFound } from "../../core/http.js";
import { translateKnown, type Lang } from "../../core/i18n.js";
import { describe, localizer, providerOf } from "./catalog.js";
import * as repo from "./repository.js";
import type { IntegrationRow } from "./repository.js";
import { decrypt, encrypt, MASK, newToken } from "./secrets.js";
import type { Config, Ctx, EventName, Provider } from "./types.js";

export interface IntegrationInput {
  provider: string;
  name: string;
  config: Config;
  events: string[];
  active: boolean;
}

function providerFor(key: string): Provider {
  const p = providerOf(key);
  if (!p) throw new HttpError(422, `Noma'lum integratsiya turi: ${key}`);
  return p;
}

/** Keeps only declared fields, encrypts secrets, and keeps the old secret when the form sends it back masked/empty. */
function seal(p: Provider, lang: Lang, input: Config, previous: Config = {}): Config {
  const tx = localizer(lang);
  const out: Config = {};
  for (const f of p.fields) {
    let value = (input[f.key] ?? "").trim();
    if (f.type === "password" && (value === MASK || value === "")) value = previous[f.key] ? decrypt(previous[f.key]) : "";
    if (f.required && !value) throw new HttpError(422, `“${tx(f.label)}” majburiy`);
    const isUrl = f.type === "url" || f.key.endsWith("_url");
    if (isUrl && value && !/^https:\/\/|^http:\/\/localhost[:/]/.test(value)) throw new HttpError(422, `“${tx(f.label)}” https:// bilan boshlanishi kerak`);
    if (value) out[f.key] = f.type === "password" ? encrypt(value) : value;
  }
  return out;
}

function events(p: Provider, list: string[]): EventName[] {
  const bad = list.filter((e) => !p.events.includes(e as EventName));
  if (bad.length) throw new HttpError(422, `${p.name} bu hodisalarni qabul qilmaydi: ${bad.join(", ")}`);
  return list as EventName[];
}

const open = (p: Provider, config: Config): Config =>
  Object.fromEntries(Object.entries(config).map(([k, v]) => [k, p.fields.find((f) => f.key === k)?.type === "password" ? decrypt(v) : v]));

export function present(row: IntegrationRow, lang: Lang) {
  const p = providerFor(row.provider);
  const config = Object.fromEntries(
    Object.entries(row.config).map(([k, v]) => [k, p.fields.find((f) => f.key === k)?.type === "password" ? MASK : v]),
  );
  return { ...row, config, last_error: row.last_error && translateKnown(lang, row.last_error), provider_info: describe(p, lang) };
}

export function ctxOf(row: IntegrationRow): { provider: Provider; ctx: Ctx } {
  const provider = providerFor(row.provider);
  return {
    provider,
    ctx: {
      id: row.id,
      name: row.name,
      config: open(provider, row.config),
      link: {
        get: (entity, entityId) => repo.getLink(row.id, entity, entityId),
        set: (entity, entityId, externalId) => repo.setLink(row.id, entity, entityId, externalId),
      },
    },
  };
}

/** Decrypted config of the first active integration of a provider, if any. */
export async function activeConfig(provider: string) {
  const [row] = await repo.activeOf([provider]);
  return row && ctxOf(row).ctx.config;
}

async function load(id: number) {
  const row = await repo.get(id);
  if (!row) throw notFound("Integratsiya topilmadi");
  return row;
}

export async function create(input: IntegrationInput, lang: Lang) {
  const p = providerFor(input.provider);
  return present(
    await repo.insert({ provider: p.key, name: input.name, config: seal(p, lang, input.config), events: events(p, input.events), token: newToken(), active: input.active }),
    lang,
  );
}

export async function update(id: number, input: Omit<IntegrationInput, "provider">, lang: Lang) {
  const row = await load(id);
  const p = providerFor(row.provider);
  return present(await repo.update(id, { name: input.name, config: seal(p, lang, input.config, row.config), events: events(p, input.events), active: input.active }), lang);
}

export const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 500);

export async function test(id: number, lang: Lang) {
  const { provider, ctx } = ctxOf(await load(id));
  try {
    const msg = await provider.test(ctx);
    await repo.markResult(id, null);
    return { ok: true, message: translateKnown(lang, msg) };
  } catch (err) {
    await repo.markResult(id, message(err));
    return { ok: false, message: translateKnown(lang, message(err)) };
  }
}

export async function sync(id: number, lang: Lang) {
  const row = await load(id);
  const { provider, ctx } = ctxOf(row);
  if (!provider.sync) throw conflict(`${provider.name} uchun qo'lda sinxronlash yo'q`);
  if (!row.active) throw conflict("Integratsiya o'chirilgan");
  try {
    const msg = await provider.sync(ctx);
    await repo.markResult(id, null, true);
    return { ok: true, message: translateKnown(lang, msg) };
  } catch (err) {
    await repo.markResult(id, message(err));
    return { ok: false, message: translateKnown(lang, message(err)) };
  }
}

export async function rotateToken(id: number, lang: Lang) {
  await load(id);
  return present(await repo.setToken(id, newToken()), lang);
}
