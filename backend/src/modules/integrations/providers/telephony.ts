import { z } from "zod";
import { tx } from "../../../core/db.js";
import { HttpError } from "../../../core/http.js";
import { emit, leadPayload } from "../events.js";
import type { Provider } from "../types.js";

export const telephony: Provider = {
  key: "telephony",
  name: "IP-telefoniya",
  category: "telephony",
  description:
    "ATS qo'ng'iroq tugaganda webhook yuboradi: raqam mijozga bog'lanadi, noma'lum kiruvchi raqamdan lid yaratiladi, o'tkazib yuborilganlar ro'yxatda ko'rinadi.",
  vendors: "OnlinePBX, Sipuni, Zadarma, Asterisk/FreePBX, UTEL, Mango, Binotel",
  fields: [
    {
      key: "create_leads",
      label: "Noma'lum raqamdan lid yaratish",
      type: "select",
      options: [
        { value: "yes", label: "Ha" },
        { value: "no", label: "Yo'q" },
      ],
    },
  ],
  events: [],
  endpoints: [
    {
      label: "Qo'ng'iroq webhook",
      method: "POST",
      path: "call",
      hint: "JSON yoki form: phone, direction=in|out, status=answered|missed, duration, call_id, record_url. caller/callee/from/to/src/dst/billsec ham qabul qilinadi.",
    },
  ],
  async test() {
    return "Webhook URL tayyor — ATS sozlamalariga qo'shing";
  },
};

const str = z.union([z.string(), z.number()]).transform(String).optional();
const callSchema = z
  .object({
    phone: str, caller: str, caller_id: str, from: str, src: str, callee: str, to: str, dst: str,
    direction: z.string().optional(), type: z.string().optional(),
    status: z.string().optional(), disposition: z.string().optional(),
    duration: z.coerce.number().optional(), billsec: z.coerce.number().optional(),
    call_id: str, uuid: str, id: str,
    record_url: z.string().optional(), recording: z.string().optional(), link: z.string().optional(),
  })
  .passthrough();

const digits = (p: string) => p.replace(/\D/g, "");

/** Normalizes PBX payload aliases into one call row; links to a client by last 9 digits. */
export async function recordCall(integrationId: number, createLeads: boolean, body: unknown) {
  const b = callSchema.parse(body);
  const rawDir = (b.direction ?? b.type ?? "in").toLowerCase();
  const direction = /out|исх/.test(rawDir) ? "out" : "in";
  const phone = (direction === "in" ? (b.phone ?? b.caller ?? b.caller_id ?? b.from ?? b.src) : (b.phone ?? b.callee ?? b.to ?? b.dst)) ?? "";
  if (digits(phone).length < 7) throw new HttpError(422, "Telefon raqami yo'q yoki noto'g'ri");
  const duration = Math.max(0, Math.round(b.billsec ?? b.duration ?? 0));
  const rawStatus = (b.status ?? b.disposition ?? "").toLowerCase();
  const status = /miss|no.?answer|busy|fail|cancel|noanswer/.test(rawStatus) || (!rawStatus && duration === 0) ? "missed" : "answered";
  const externalId = b.call_id ?? b.uuid ?? b.id ?? null;
  const tail = digits(phone).slice(-9);

  return tx(async (db) => {
    const client = await db.query<{ id: number }>(
      `SELECT id FROM clients WHERE right(regexp_replace(COALESCE(phone,''), '\\D', '', 'g'), 9) = $1 LIMIT 1`,
      [tail],
    );
    let leadId: number | null = null;
    if (!client.rows[0] && direction === "in" && createLeads) {
      const existing = await db.query<{ id: number }>(
        `SELECT id FROM leads WHERE right(regexp_replace(phone, '\\D', '', 'g'), 9) = $1 AND status IN ('new','contacted') LIMIT 1`,
        [tail],
      );
      leadId = existing.rows[0]?.id ?? null;
      if (!leadId) {
        const { rows } = await db.query<{ id: number }>(
          `INSERT INTO leads (name, phone, message) VALUES ($1, $2, $3) RETURNING id`,
          ["Qo'ng'iroq", phone, status === "missed" ? "O'tkazib yuborilgan qo'ng'iroq" : "Kiruvchi qo'ng'iroq"],
        );
        leadId = rows[0].id;
        await emit(db, "lead.created", () => leadPayload(db, leadId!));
      }
    }
    const { rows } = await db.query(
      `INSERT INTO calls (integration_id, external_id, direction, status, phone, client_id, lead_id, duration_sec, recording_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (integration_id, external_id) DO UPDATE SET status = EXCLUDED.status, duration_sec = EXCLUDED.duration_sec,
         recording_url = COALESCE(EXCLUDED.recording_url, calls.recording_url)
       RETURNING id, status, client_id, lead_id`,
      [integrationId, externalId, direction, status, phone, client.rows[0]?.id ?? null, leadId, duration, b.record_url ?? b.recording ?? b.link ?? null],
    );
    return rows[0];
  });
}
