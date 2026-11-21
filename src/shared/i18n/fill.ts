export type Vars = Record<string, string | number>;

/** Replaces `{slot}` placeholders; unknown slots stay as they are. */
export const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] !== undefined ? String(vars[k]) : m)) : s);
