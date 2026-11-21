import { Redirect } from "expo-router";
import { TABS } from "@/features/shell/nav";
import { useSession } from "@/shared/lib/session";
import { Loading } from "@/shared/ui/States";

export default function Index() {
  const { status, user } = useSession();
  if (status === "loading") return <Loading full />;
  if (status === "signedOut" || !user) return <Redirect href="/welcome" />;
  return <Redirect href={`/${TABS[user.role][0]}`} />;
}
