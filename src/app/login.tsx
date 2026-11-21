import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { useSession } from "@/shared/lib/session";

export default function Login() {
  const { status } = useSession();
  if (status === "signedIn") return <Redirect href="/" />;
  return (
    <>
      <StatusBar style="dark" />
      <LoginScreen />
    </>
  );
}
