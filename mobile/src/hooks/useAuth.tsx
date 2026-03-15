import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useLazyQuery } from "@apollo/client";
import { useTokenStorage } from "./useTokenStorage";
import { useAppPreferences, PREF_KEYS } from "./useAppPreferences";
import { AUTH_TOKEN, ME_QUERY } from "../api/graphql/operations";
import { setOnAuthError, setServerUrl } from "../api/apolloClient";

interface StoreInfo {
  id: string;
  code: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  storeId: string | null;
  storeName: string | null;
  stores: StoreInfo[];
  serverUrl: string | null;
  nameId: string | null;
}

interface AuthContextType extends AuthState {
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; stores?: StoreInfo[] }>;
  logout: () => Promise<void>;
  selectStore: (store: StoreInfo) => Promise<void>;
  setServerUrlAndSave: (url: string) => Promise<void>;
  loadSavedState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { storeToken, clearToken, getToken } = useTokenStorage();
  const prefs = useAppPreferences();

  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    storeId: null,
    storeName: null,
    stores: [],
    serverUrl: null,
    nameId: null,
  });

  const [authTokenQuery] = useLazyQuery(AUTH_TOKEN);
  const [fetchMe] = useLazyQuery(ME_QUERY);

  // Load saved preferences on mount
  const loadSavedState = useCallback(async () => {
    try {
      const [url, storeId, storeName, nameId] = await Promise.all([
        prefs.get<string>(PREF_KEYS.SERVER_URL),
        prefs.get<string>(PREF_KEYS.STORE_ID),
        prefs.get<string>(PREF_KEYS.STORE_NAME),
        prefs.get<string>(PREF_KEYS.NAME_ID),
      ]);

      if (url) {
        setServerUrl(url);
      }

      const token = await getToken();
      const isAuthenticated = !!token && !!storeId;

      setState((s) => ({
        ...s,
        serverUrl: url,
        storeId,
        storeName,
        nameId,
        isAuthenticated,
        isLoading: false,
      }));
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [prefs, getToken]);

  useEffect(() => {
    loadSavedState();
  }, [loadSavedState]);

  // Redirect to login on 401
  useEffect(() => {
    setOnAuthError(() => {
      clearToken();
      setState((s) => ({
        ...s,
        isAuthenticated: false,
        storeId: null,
        stores: [],
      }));
    });
  }, [clearToken]);

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const { data } = await authTokenQuery({
          variables: { username, password },
        });

        const result = data?.authToken;
        if (!result) {
          return { success: false, error: "No response from server" };
        }

        if (result.__typename === "AuthTokenError") {
          const error = result.error;
          if (error.__typename === "AccountBlocked") {
            return {
              success: false,
              error: `Account blocked — try again in ${error.timeoutRemaining}s`,
            };
          }
          return {
            success: false,
            error: error.description || "Invalid username or password",
          };
        }

        const token = result.token;
        await storeToken(token);

        // Fetch user stores
        const { data: meData } = await fetchMe();
        const stores: StoreInfo[] =
          meData?.me?.stores?.nodes ?? [];

        if (stores.length === 0) {
          await clearToken();
          return {
            success: false,
            error: "This account has no stores on this server",
          };
        }

        if (stores.length === 1) {
          const store = stores[0];
          await prefs.set(PREF_KEYS.STORE_ID, store.id);
          await prefs.set(PREF_KEYS.STORE_NAME, store.name);
          setState((s) => ({
            ...s,
            isAuthenticated: true,
            storeId: store.id,
            storeName: store.name,
            stores,
          }));
          return { success: true };
        }

        // Multiple stores — caller needs to show picker
        setState((s) => ({
          ...s,
          stores,
        }));
        return { success: true, stores };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection failed";
        return { success: false, error: message };
      }
    },
    [authTokenQuery, fetchMe, storeToken, clearToken, prefs]
  );

  const selectStore = useCallback(
    async (store: StoreInfo) => {
      await prefs.set(PREF_KEYS.STORE_ID, store.id);
      await prefs.set(PREF_KEYS.STORE_NAME, store.name);
      setState((s) => ({
        ...s,
        isAuthenticated: true,
        storeId: store.id,
        storeName: store.name,
      }));
    },
    [prefs]
  );

  const logout = useCallback(async () => {
    await clearToken();
    await prefs.remove(PREF_KEYS.STORE_ID);
    await prefs.remove(PREF_KEYS.STORE_NAME);
    setState((s) => ({
      ...s,
      isAuthenticated: false,
      storeId: null,
      storeName: null,
      stores: [],
    }));
  }, [clearToken, prefs]);

  const setServerUrlAndSave = useCallback(
    async (url: string) => {
      setServerUrl(url);
      await prefs.set(PREF_KEYS.SERVER_URL, url);
      setState((s) => ({ ...s, serverUrl: url }));
    },
    [prefs]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        selectStore,
        setServerUrlAndSave,
        loadSavedState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
