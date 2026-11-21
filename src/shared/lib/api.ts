import { activeLang } from "@/shared/i18n/active";
import { tr } from "@/shared/i18n/translate";
import { API_URL } from "./env";
import { getToken } from "./token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const TIMEOUT_MS = 30_000;

let onUnauthorized: (() => void) | null = null;
/** The session registers its sign-out here: any 401 outside login and public routes ends the session. */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers: extraHeaders, ...rest } = init;
  const headers: Record<string, string> = { "x-lang": activeLang(), "x-client": "mobile", accept: "application/json" };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  if (json !== undefined) headers["content-type"] = "application/json";
  Object.assign(headers, extraHeaders as Record<string, string> | undefined);

  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, TIMEOUT_MS);
  rest.signal?.addEventListener("abort", () => ctrl.abort());

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, signal: ctrl.signal, credentials: "include", headers, body: json !== undefined ? JSON.stringify(json) : rest.body });
  } catch (err) {
    if (rest.signal?.aborted) throw err;
    throw new ApiError(0, timedOut ? tr("Server javob bermadi — qayta urinib ko'ring") : tr("Tarmoq bilan aloqa yo'q — internetni tekshiring"));
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/me/password") && !path.startsWith("/public/")) {
    onUnauthorized?.();
    throw new ApiError(401, tr("Sessiya tugadi"));
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = body?.issues?.[0];
    const detail = issue ? `${issue.path?.join(".") ?? ""}: ${issue.message}` : "";
    throw new ApiError(res.status, body?.error ? `${body.error}${detail ? ` (${detail})` : ""}` : tr("Xatolik yuz berdi"));
  }
  return body as T;
}

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

export const errorText = (e: unknown) => (e instanceof Error ? e.message : tr("Xatolik yuz berdi"));
