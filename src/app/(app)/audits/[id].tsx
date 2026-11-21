import { useLocalSearchParams } from "expo-router";
import { AuditDetail } from "@/features/audits/AuditDetail";

export default function AuditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AuditDetail id={id} />;
}
