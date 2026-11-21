import { useLocalSearchParams } from "expo-router";
import { ClientDetail } from "@/features/clients/ClientDetail";

export default function ClientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ClientDetail id={id} />;
}
