import { Stack, useLocalSearchParams } from "expo-router";
import { ClientForm } from "@/features/clients/ClientForm";
import { useT } from "@/shared/i18n/I18nProvider";

/** `?id=` switches the form to edit mode. */
export default function ClientFormRoute() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <>
      {id ? <Stack.Screen options={{ title: t("Tahrirlash") }} /> : null}
      <ClientForm id={id} />
    </>
  );
}
