import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "../../core/config.js";

const key = createHash("sha256").update(config.secretKey).digest();
const PREFIX = "enc:v1:";
export const MASK = "********";

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(":");
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const [iv, tag, data] = value.slice(PREFIX.length).split(":").map((s) => Buffer.from(s, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export const newToken = () => randomBytes(24).toString("hex");
