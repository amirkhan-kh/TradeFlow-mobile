import {
  Boxes,
  ClipboardCheck,
  Contact,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  ShoppingCart,
  Sparkles,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react-native";
import type { MsgKey } from "@/shared/i18n/messages";
import type { Role } from "@/shared/lib/roles";

export type TabName = "home" | "orders" | "clients" | "finance" | "deliveries" | "stock" | "audits" | "more";

export const TAB_META: Record<TabName, { label: MsgKey; icon: LucideIcon }> = {
  home: { label: "Dashboard", icon: LayoutDashboard },
  orders: { label: "Buyurtmalar", icon: ShoppingCart },
  clients: { label: "Mijozlar", icon: Contact },
  finance: { label: "Moliya", icon: Wallet },
  deliveries: { label: "Yetkazib berish", icon: Truck },
  stock: { label: "Qoldiq va harakat", icon: Boxes },
  audits: { label: "Audit", icon: ClipboardCheck },
  more: { label: "Ko'proq", icon: Users },
};

/** Bottom tabs per role (max 5); everything else lives under "More". */
export const TABS: Record<Role, TabName[]> = {
  admin: ["home", "orders", "stock", "finance", "more"],
  manager: ["home", "orders", "stock", "finance", "more"],
  agent: ["home", "orders", "clients", "finance", "more"],
  courier: ["deliveries", "orders", "finance", "more"],
  auditor: ["audits", "stock", "more"],
};

export type MoreScreen = "home" | "clients" | "deliveries" | "audits" | "stock" | "products" | "warehouses" | "agents" | "insights" | "assistant" | "leads" | "orders" | "finance";

export const MORE_META: Record<MoreScreen, { label: MsgKey; icon: LucideIcon }> = {
  home: { label: "Dashboard", icon: LayoutDashboard },
  orders: { label: "Buyurtmalar", icon: ShoppingCart },
  finance: { label: "Moliya", icon: Wallet },
  clients: { label: "Mijozlar", icon: Contact },
  deliveries: { label: "Yetkazib berish", icon: Truck },
  audits: { label: "Audit", icon: ClipboardCheck },
  stock: { label: "Qoldiq va harakat", icon: Boxes },
  products: { label: "Tovarlar", icon: Package },
  warehouses: { label: "Omborlar", icon: Warehouse },
  agents: { label: "Savdo jamoasi", icon: Users },
  insights: { label: "Aqlli agentlar", icon: Sparkles },
  assistant: { label: "Agent suhbat", icon: MessageSquare },
  leads: { label: "Lidlar", icon: Megaphone },
};

export const MORE: Record<Role, MoreScreen[]> = {
  admin: ["assistant", "insights", "clients", "deliveries", "audits", "products", "warehouses", "agents", "leads"],
  manager: ["assistant", "insights", "clients", "deliveries", "audits", "products", "warehouses", "agents", "leads"],
  agent: ["insights", "deliveries", "stock", "products", "agents"],
  courier: ["home", "clients"],
  auditor: ["assistant", "insights", "home", "warehouses", "products"],
};

export const PROFILE_ICON = UserRound;
