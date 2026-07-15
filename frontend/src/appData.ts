import type { LayeredConfig } from './ui/elements/table/tableConfig';

// Spec (Store Login, Guard 2): the previously logged-in store, stored in app data,
// type safe, keyed by user id. Trusted layer for the read cast: this module is the
// only reader and writer of the key, so the stored shape is what it wrote.
//
// tableConfigByUserId: the USER layer of table column config (kdd/table-state) — the
// only writable config layer. Keyed by user id then tableId, so a shared device does
// not leak one user's layout to another (same shape as previousStoreIdByUserId). Value
// is a LayeredConfig (per-breakpoint TableConfig) — the exact type DataTable resolves.
type AppData = {
  previousStoreIdByUserId?: Record<string, string>;
  tableConfigByUserId?: Record<string, Record<string, LayeredConfig>>;
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

export const recordPreviousStoreId = (
  userId: string,
  storeId: string
): void => {
  const data = readAppData();
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({
      ...data,
      previousStoreIdByUserId: {
        ...data.previousStoreIdByUserId,
        [userId]: storeId,
      },
    })
  );
};

// The user's saved column config for a table (the writable layer). `{}` when the user
// has never customised it — resolution then falls through to global/default/TanStack.
export const getUserTableConfig = (
  userId: string,
  tableId: string
): LayeredConfig =>
  readAppData().tableConfigByUserId?.[userId]?.[tableId] ?? {};

// Persist the user's config for a table. An empty config removes the entry (rather than
// storing `{}`) so app data does not accumulate empties once a user resets to default.
export const setUserTableConfig = (
  userId: string,
  tableId: string,
  config: LayeredConfig
): void => {
  const data = readAppData();
  const forUser = { ...data.tableConfigByUserId?.[userId] };
  if (isEmptyLayeredConfig(config)) delete forUser[tableId];
  else forUser[tableId] = config;
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({
      ...data,
      tableConfigByUserId: { ...data.tableConfigByUserId, [userId]: forUser },
    })
  );
};

// A LayeredConfig is empty when no band holds any (non-empty) TableConfig field.
const isEmptyLayeredConfig = (config: LayeredConfig): boolean =>
  Object.values(config).every(
    band => !band || Object.values(band).every(field => field == null)
  );
