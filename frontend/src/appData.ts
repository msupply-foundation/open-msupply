// Spec (Store Login, Guard 2): the previously logged-in store, stored in app data,
// type safe, keyed by user id. Trusted layer for the read cast: this module is the
// only reader and writer of the key, so the stored shape is what it wrote.
type AppData = {
  previousStoreIdByUserId?: Record<string, string>;
};

const APP_DATA_KEY = 'open-mSupply-app-data';

const readAppData = (): AppData => {
  try {
    return JSON.parse(localStorage.getItem(APP_DATA_KEY) ?? '{}') as AppData;
  } catch {
    return {};
  }
};

export const getPreviousStoreId = (userId: string): string | undefined =>
  readAppData().previousStoreIdByUserId?.[userId];

export const recordPreviousStoreId = (userId: string, storeId: string): void => {
  const data = readAppData();
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({
      ...data,
      previousStoreIdByUserId: { ...data.previousStoreIdByUserId, [userId]: storeId },
    }),
  );
};
