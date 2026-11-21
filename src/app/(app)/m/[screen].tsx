import { Stack, useLocalSearchParams } from "expo-router";
import { AgentsScreen } from "@/features/agents/AgentsScreen";
import { AuditsList } from "@/features/audits/AuditsList";
import { ClientsList } from "@/features/clients/ClientsList";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { DeliveriesList } from "@/features/deliveries/DeliveriesList";
import { FinanceList } from "@/features/finance/FinanceList";
import { InsightsScreen } from "@/features/insights/InsightsScreen";
import { LeadsList } from "@/features/leads/LeadsList";
import { OrdersList } from "@/features/orders/OrdersList";
import { ProductsList } from "@/features/products/ProductsList";
import { MORE_META, type MoreScreen } from "@/features/shell/nav";
import { StockScreen } from "@/features/stock/StockScreen";
import { WarehousesList } from "@/features/warehouses/WarehousesList";
import { useT } from "@/shared/i18n/I18nProvider";
import { Empty } from "@/shared/ui/States";

/** Screens reached from "More", dashboard cards and insight links (`/m/clients?status=overlimit`). */
export default function MoreRoute() {
  const t = useT();
  const { screen, status, low, warehouse_id } = useLocalSearchParams<{ screen: MoreScreen; status?: string; low?: string; warehouse_id?: string }>();
  const meta = MORE_META[screen];
  if (!meta) return <Empty title={t("Hech narsa topilmadi")} />;

  const body = {
    home: <DashboardScreen />,
    orders: <OrdersList initialStatus={status} />,
    finance: <FinanceList />,
    clients: <ClientsList initialStatus={status} />,
    deliveries: <DeliveriesList initialStatus={status} />,
    audits: <AuditsList initialStatus={status} />,
    stock: <StockScreen initialLow={low === "true"} initialWarehouse={warehouse_id} />,
    products: <ProductsList />,
    warehouses: <WarehousesList />,
    agents: <AgentsScreen />,
    insights: <InsightsScreen />,
    leads: <LeadsList />,
  }[screen];

  return (
    <>
      <Stack.Screen options={{ title: t(meta.label) }} />
      {body}
    </>
  );
}
