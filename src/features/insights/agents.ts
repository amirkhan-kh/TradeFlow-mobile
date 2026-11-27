import { ClipboardCheck, HandCoins, Route, TrendingUp, Warehouse, type LucideIcon } from "lucide-react-native";
import type { MsgKey } from "@/shared/i18n/messages";
import type { InsightAgent } from "./types";

export type AgentKey = InsightAgent["key"];

export const AGENTS: {
  key: AgentKey;
  name: MsgKey;
  blurb: MsgKey;
  example: MsgKey;
  Icon: LucideIcon;
}[] = [
  {
    key: "audit",
    name: "Audit agenti",
    blurb: "Inventarizatsiya jadvali, ochiq auditlar va kamomadlar",
    example: "Qaysi omborlarda audit kechikkan?",
    Icon: ClipboardCheck,
  },
  {
    key: "finance",
    name: "Moliya agenti",
    blurb: "Debitorlik, kredit limiti va undirish",
    example: "Kredit limitidan oshgan mijozlar kimlar?",
    Icon: HandCoins,
  },
  {
    key: "stock",
    name: "Ombor agenti",
    blurb: "Tez va sekin tugaydigan zaxira, yaroqlilik muddati",
    example: "Qaysi tovarlar tez tugaydi?",
    Icon: Warehouse,
  },
  {
    key: "sales",
    name: "Sotuv agenti",
    blurb: "Reja bajarilishi va faol bo'lmagan mijozlar",
    example: "Qaysi agentlar rejadan ortda?",
    Icon: TrendingUp,
  },
  {
    key: "logistics",
    name: "Logistika agenti",
    blurb: "Yetkazish kechikishlari va muvaffaqiyatsiz yetkazishlar",
    example: "Nechta yetkazish kechikmoqda?",
    Icon: Route,
  },
];

export const agentOf = (key: AgentKey) => AGENTS.find((a) => a.key === key) ?? AGENTS[0];

/** Chat + create_audit: server `allow("manager","auditor")` (+ admin always). */
export function canUseAssistant(role: string): boolean {
  return role === "admin" || role === "manager" || role === "auditor";
}
