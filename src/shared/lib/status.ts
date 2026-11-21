import type { MsgKey } from "@/shared/i18n/messages";

export type Tone = "green" | "amber" | "red" | "blue" | "gray" | "violet";

/** Labels are i18n keys: render them through `t()`. */
export const STATUS: Record<string, { label: MsgKey; tone: Tone }> = {
  // orders
  new: { label: "Yangi", tone: "blue" },
  confirmed: { label: "Tasdiqlangan", tone: "violet" },
  shipped: { label: "Yuklangan", tone: "amber" },
  delivered: { label: "Yetkazildi", tone: "green" },
  cancelled: { label: "Bekor qilingan", tone: "gray" },
  // deliveries
  pending: { label: "Kutilmoqda", tone: "blue" },
  on_route: { label: "Yo'lda", tone: "amber" },
  failed: { label: "Muvaffaqiyatsiz", tone: "red" },
  // audits
  in_progress: { label: "Tekshirilmoqda", tone: "amber" },
  completed: { label: "Tasdiq kutmoqda", tone: "violet" },
  approved: { label: "Tasdiqlandi", tone: "green" },
  // leads
  contacted: { label: "Bog'lanildi", tone: "amber" },
  won: { label: "Mijozga aylandi", tone: "green" },
  lost: { label: "Yo'qotildi", tone: "gray" },
  // stock movements
  in: { label: "Kirim", tone: "green" },
  out: { label: "Chiqim", tone: "amber" },
  transfer: { label: "Ko'chirish", tone: "blue" },
  adjust: { label: "Tuzatish", tone: "violet" },
  // payments
  cash: { label: "Naqd", tone: "green" },
  card: { label: "Karta", tone: "blue" },
  // integrations
  sent: { label: "Yuborildi", tone: "green" },
  answered: { label: "Javob berildi", tone: "green" },
  missed: { label: "O'tkazib yuborildi", tone: "red" },
  // roles
  admin: { label: "Administrator", tone: "green" },
  manager: { label: "Menejer", tone: "blue" },
  agent: { label: "Savdo agenti", tone: "violet" },
  courier: { label: "Kuryer", tone: "amber" },
  auditor: { label: "Auditor", tone: "gray" },
};

export const statusOf = (key: string) => STATUS[key] ?? { label: key as MsgKey, tone: "gray" as Tone };
