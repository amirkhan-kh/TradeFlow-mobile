export const EVENTS = {
  "order.created": "Yangi buyurtma",
  "order.status_changed": "Buyurtma holati o'zgardi",
  "payment.created": "To'lov qabul qilindi",
  "client.created": "Yangi mijoz",
  "lead.created": "Yangi lid (sayt formasi)",
  "stock.moved": "Ombor harakati (kirim/chiqim/ko'chirish)",
} as const;

export type EventName = keyof typeof EVENTS;
export const EVENT_NAMES = Object.keys(EVENTS) as EventName[];

export type Category =
  | "payments"
  | "einvoice"
  | "marketplace"
  | "bi"
  | "erp"
  | "crm"
  | "pos"
  | "distribution"
  | "telephony"
  | "messenger"
  | "sms"
  | "automation";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "url" | "password" | "number" | "select";
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

/** Inbound URL served under /api/v1/public/integrations/:token/<path>. */
export interface Endpoint {
  label: string;
  method: "GET" | "POST";
  path: string;
  hint?: string;
}

export type Config = Record<string, string>;

export interface Ctx {
  id: number;
  name: string;
  config: Config;
  link: {
    get(entity: string, entityId: number): Promise<string | undefined>;
    set(entity: string, entityId: number, externalId: string): Promise<void>;
  };
}

export interface Provider {
  key: string;
  name: string;
  category: Category;
  description: string;
  vendors?: string;
  docs?: string;
  fields: FieldDef[];
  /** Outbound events this provider can receive. */
  events: EventName[];
  /** Serves read-only datasets at feed/:dataset. */
  feeds?: boolean;
  endpoints?: Endpoint[];
  test(ctx: Ctx): Promise<string>;
  push?(ctx: Ctx, event: EventName, data: Payload): Promise<void>;
  /** Manual "Sinxronlash" action: pull from or upload to the remote system. */
  sync?(ctx: Ctx): Promise<string>;
}

export interface OrderPayload {
  order: { id: number; number: string; status: string; previous_status?: string; subtotal: number; discount_pct: number; total: number; note: string | null; created_at: string };
  client: { id: number; name: string; phone: string | null; region: string; address: string | null };
  warehouse: { id: number; code: string; name: string };
  items: { product_id: number; sku: string; name: string; quantity: number; price: number }[];
}
export interface PaymentPayload {
  payment: { id: number; amount: number; method: "cash" | "card" | "transfer" | "payme" | "click"; note: string | null; order_id: number | null; created_at: string };
  client: { id: number; name: string; phone: string | null; balance: number };
}
export interface ClientPayload {
  client: { id: number; name: string; owner_name: string | null; phone: string | null; region: string; address: string | null; inn: string | null; segment: string; credit_limit: number };
}
export interface LeadPayload {
  lead: { id: number; name: string; phone: string; company: string | null; message: string | null };
}
export interface StockPayload {
  movement: { id: number; type: string; quantity: number; note: string | null; created_at: string };
  product: { id: number; sku: string; name: string };
  warehouse: { id: number; code: string; name: string };
  to_warehouse: { id: number; code: string; name: string } | null;
}
export type Payload = OrderPayload | PaymentPayload | ClientPayload | LeadPayload | StockPayload;
