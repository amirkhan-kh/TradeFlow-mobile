import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WelcomeScreen } from "@/features/auth/WelcomeScreen";
import { useSession } from "@/shared/lib/session";

export default function Welcome() {
  const { status } = useSession();
  if (status === "signedIn") return <Redirect href="/" />;
  return (
    <>
      <StatusBar style="light" />
      <WelcomeScreen />
    </>
  );
}
