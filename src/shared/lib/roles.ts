import type { MsgKey } from "@/shared/i18n/messages";

export type Role = "admin" | "manager" | "agent" | "courier" | "auditor";

/** Labels and descriptions are i18n keys: render them through `t()`. */
export const ROLES: Record<Role, { label: MsgKey; description: MsgKey; color: string }> = {
  admin: { label: "Administrator", description: "Hamma narsa: xodimlar, rollar, integratsiyalar, jurnal", color: "#137852" },
  manager: { label: "Menejer", description: "Savdo, ombor, moliya va yetkazishni boshqaradi", color: "#2563eb" },
  agent: { label: "Savdo agenti", description: "Mijoz qo'shadi, buyurtma va to'lov qabul qiladi", color: "#7c3aed" },
  courier: { label: "Kuryer", description: "Yetkazadi, holatni yangilaydi, to'lov qabul qiladi", color: "#d97706" },
  auditor: { label: "Auditor", description: "Inventarizatsiya o'tkazadi va natijani topshiradi", color: "#64748b" },
};
export const ROLE_KEYS = Object.keys(ROLES) as Role[];

/** Mirrors backend `allow(...)` guards; admin always passes. */
export const PERMISSIONS: { area: MsgKey; items: [MsgKey, Role[]][] }[] = [
  {
    area: "Savdo",
    items: [
      ["Dashboard va hisobotlarni ko'rish", ["admin", "manager", "agent", "courier", "auditor"]],
      ["Buyurtma yaratish", ["admin", "manager", "agent"]],
      ["Buyurtmani tasdiqlash / yuklash / yetkazish", ["admin", "manager", "courier"]],
      ["Mijoz qo'shish, INN bo'yicha to'ldirish", ["admin", "manager", "agent"]],
      ["Mijozni tahrirlash, kredit limiti", ["admin", "manager"]],
    ],
  },
  {
    area: "Moliya",
    items: [
      ["To'lov qabul qilish, to'lov havolasi", ["admin", "manager", "agent", "courier"]],
    ],
  },
  {
    area: "Ombor va logistika",
    items: [
      ["Tovar, ombor, kirim-chiqim", ["admin", "manager"]],
      ["Inventarizatsiya o'tkazish", ["admin", "manager", "auditor"]],
      ["Inventarizatsiyani tasdiqlash", ["admin", "manager"]],
      ["Yetkazishni yangilash", ["admin", "manager", "courier"]],
    ],
  },
  {
    area: "Boshqaruv",
    items: [
      ["Xodim yaratish, rol berish, bloklash", ["admin"]],
      ["Parolni tiklash, sessiyani yopish", ["admin"]],
      ["Integratsiyalar va faoliyat jurnali", ["admin"]],
    ],
  },
];

export const ACTIONS: Record<string, { label: MsgKey; tone: "green" | "red" | "amber" | "blue" | "violet" | "gray" }> = {
  "auth.login": { label: "Tizimga kirdi", tone: "green" },
  "auth.login_failed": { label: "Noto'g'ri parol", tone: "amber" },
  "auth.locked": { label: "Kirish vaqtincha bloklandi", tone: "red" },
  "profile.updated": { label: "Profilini yangiladi", tone: "blue" },
  "profile.password_changed": { label: "Parolini o'zgartirdi", tone: "violet" },
  "user.created": { label: "Xodim yaratdi", tone: "green" },
  "user.updated": { label: "Xodim ma'lumotini o'zgartirdi", tone: "blue" },
  "user.role_changed": { label: "Rolni o'zgartirdi", tone: "violet" },
  "user.password_reset": { label: "Parolni tikladi", tone: "amber" },
  "user.activated": { label: "Faollashtirdi", tone: "green" },
  "user.deactivated": { label: "Blokladi", tone: "red" },
  "user.sessions_revoked": { label: "Sessiyalarni yopdi", tone: "amber" },
};

/** Same groups as backend `allow(...)`; admin always passes. Hides actions the server would reject. */
const ACCESS = {
  orderCreate: ["manager", "agent"],
  orderStatus: ["manager", "courier"],
  clientCreate: ["manager", "agent"],
  clientEdit: ["manager"],
  payment: ["manager", "agent", "courier"],
  catalog: ["manager"],
  auditRun: ["manager", "auditor"],
  auditApprove: ["manager"],
  delivery: ["manager", "courier"],
} satisfies Record<string, Role[]>;
export type Access = keyof typeof ACCESS;

export const can = (role: Role | undefined, what: Access) => role === "admin" || (role !== undefined && (ACCESS[what] as Role[]).includes(role));

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
