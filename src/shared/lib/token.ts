import * as SecureStore from "expo-secure-store";

const KEY = "tf_token";

/** In-memory copy so every request does not hit the keystore. */
let current: string | null = null;

export const getToken = () => current;

export async function loadToken() {
  current = await SecureStore.getItemAsync(KEY).catch(() => null);
  return current;
}

export async function saveToken(token: string) {
  current = token;
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken() {
  current = null;
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}
