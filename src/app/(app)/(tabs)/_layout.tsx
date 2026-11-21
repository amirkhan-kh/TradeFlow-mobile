import { Tabs } from "expo-router";
import { TAB_META, TABS, type TabName } from "@/features/shell/nav";
import { useT } from "@/shared/i18n/I18nProvider";
import { useMe } from "@/shared/lib/session";
import { useFontFamily } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";

const ALL: TabName[] = ["home", "orders", "clients", "deliveries", "audits", "stock", "finance", "more"];

/** Every tab route exists for every role; tabs outside the role's set are hidden (`href: null`). */
export default function TabsLayout() {
  const t = useT();
  const me = useMe();
  const font = useFontFamily("semibold");
  const visible = TABS[me.role];
  // Tab bar order follows declaration order, so the role's tabs go first.
  const ordered = [...visible, ...ALL.filter((n) => !visible.includes(n))];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.ink[400],
        tabBarLabelStyle: { fontFamily: font, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.ink[100], backgroundColor: "#ffffff" },
        sceneStyle: { backgroundColor: colors.ink[50] },
      }}
    >
      {ordered.map((name) => {
        const { label, icon: Icon } = TAB_META[name];
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              href: visible.includes(name) ? undefined : null,
              title: name === "stock" ? t("Qoldiqlar") : t(label),
              tabBarIcon: ({ color, size }) => <Icon color={color} size={size - 2} />,
              tabBarButtonTestID: `tab-${name}`,
            }}
          />
        );
      })}
    </Tabs>
  );
}
