import { invoke } from "@tauri-apps/api/core";

interface StoredCredentials {
  token: string;
  refresh_token: string | null;
}

export function useTokenStorage() {
  const storeToken = async (token: string, refreshToken?: string) => {
    await invoke("store_token", {
      token,
      refreshToken: refreshToken ?? null,
    });
  };

  const getToken = async (): Promise<string | null> => {
    const creds = await invoke<StoredCredentials | null>("get_token");
    return creds?.token ?? null;
  };

  const clearToken = async () => {
    await invoke("clear_token");
  };

  return { storeToken, getToken, clearToken };
}
