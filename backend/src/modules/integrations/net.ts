/** Outbound HTTP for providers: timeout, JSON in/out, readable errors. */
export async function request<T = unknown>(
  url: string,
  init: { method?: string; headers?: Record<string, string>; json?: unknown; body?: BodyInit; timeoutMs?: number } = {},
): Promise<{ status: number; data: T; headers: Headers }> {
  const { json, timeoutMs = 15_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      method: rest.method ?? (json !== undefined || rest.body ? "POST" : "GET"),
      headers: json !== undefined ? { "content-type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "javob kelmadi (timeout)" : (err as Error).message;
    throw new Error(`${new URL(url).host}: ${reason}`);
  }
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body stays as text */
  }
  if (!res.ok) throw new Error(`${new URL(url).host} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  return { status: res.status, data: data as T, headers: res.headers };
}

export const basicAuth = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

export const trimSlash = (url: string) => url.replace(/\/+$/, "");
