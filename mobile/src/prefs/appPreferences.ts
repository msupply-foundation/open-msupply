import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_URL: 'server_url',
  STORE_ID: 'store_id',
  NAME_CODE: 'name_code',
  NAME_ID: 'name_id',
} as const;

export const appPreferences = {
  // Server URL
  async getServerUrl(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.SERVER_URL);
  },
  async setServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SERVER_URL, url);
  },

  // Store
  async getStoreId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.STORE_ID);
  },
  async setStoreId(id: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.STORE_ID, id);
  },

  // Dummy patient name code (for outbound shipments)
  async getNameCode(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.NAME_CODE);
  },
  async setNameCode(code: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.NAME_CODE, code);
  },

  // Resolved name_id for the dummy patient
  async getNameId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.NAME_ID);
  },
  async setNameId(id: string | null): Promise<void> {
    if (id === null) {
      await AsyncStorage.removeItem(KEYS.NAME_ID);
    } else {
      await AsyncStorage.setItem(KEYS.NAME_ID, id);
    }
  },

  // Clear all preferences (used on logout)
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.STORE_ID,
      KEYS.NAME_ID,
    ]);
  },
};
