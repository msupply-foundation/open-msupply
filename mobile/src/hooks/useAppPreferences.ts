import { load, Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useRef } from "react";

const STORE_PATH = "app-preferences.json";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_PATH, { autoSave: true } as Parameters<typeof load>[1]);
  }
  return storePromise;
}

export function useAppPreferences() {
  const storeRef = useRef<Store | null>(null);

  useEffect(() => {
    getStore().then((s) => {
      storeRef.current = s;
    });
  }, []);

  const get = useCallback(async <T>(key: string): Promise<T | null> => {
    const store = await getStore();
    const val = await store.get<T>(key);
    return val ?? null;
  }, []);

  const set = useCallback(async <T>(key: string, value: T) => {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
  }, []);

  const remove = useCallback(async (key: string) => {
    const store = await getStore();
    await store.delete(key);
    await store.save();
  }, []);

  return { get, set, remove };
}

// Preference keys
export const PREF_KEYS = {
  SERVER_URL: "server_url",
  STORE_ID: "store_id",
  STORE_NAME: "store_name",
  NAME_CODE: "name_code",
  NAME_ID: "name_id",
  NAME_DISPLAY: "name_display",
} as const;
