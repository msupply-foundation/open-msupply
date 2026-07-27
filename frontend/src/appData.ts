import type { LayeredConfig } from './ui/elements/table/tableConfig';

// Spec (Store Login, Guard 2): the previously logged-in store, stored in app
// data, type safe, keyed by user id. Trusted layer for the read cast: this
// module is the only reader and writer of the key, so the stored shape is what
// it wrote.
//
// tableConfigByUserId: the USER layer of table column config (kdd/table-state)
// — the only writable config layer. Keyed by user id then tableId, so a shared
// device does not leak one user's layout to another (same shape as
// previousStoreIdByUserId). Value is a LayeredConfig (per-breakpoint
// TableConfig) — the exact type DataTable resolves.
type AppData = {
  previousStoreIdByUserId?: Record<string, string>;
  // "Remember my choice" on the store picker (spec startup SL-6): a per-user
  // device preference that auto-enters this store on the next login without
  // showing the picker. Cleared when the user confirms with the box unticked.
  rememberedStoreIdByUserId?: Record<string, string>;
  tableConfigByUserId?: Record<string, Record<string, LayeredConfig>>;
  // Label printer "print via USB" (spec/settings rules § Devices — label
  // printer): a DEVICE-local preference, deliberately not keyed by user and
  // never sent to the server (OMS-REG-SET-05.22) — it describes how this
  // machine reaches the printer, not a user's or the store's choice.
  labelPrinterUseUsb?: boolean;
  // Mock barcode scanner toggle (spec/settings rules § Devices — barcode
  // scanner): remembered on this device, never sent to the server — a
  // testing aid tied to the machine, like the USB preference above.
  mockBarcodeScannerEnabled?: boolean;
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

// "Remember my choice" store for a user (spec startup SL-6): the store to
// auto-enter on login instead of showing the picker. Undefined once cleared.
export const getRememberedStoreId = (userId: string): string | undefined =>
  readAppData().rememberedStoreIdByUserId?.[userId];

// Set (remember ticked) or clear (unticked) the remembered store for a user.
export const setRememberedStoreId = (
  userId: string,
  storeId: string | undefined
): void => {
  const data = readAppData();
  const byUser = { ...data.rememberedStoreIdByUserId };
  if (storeId) byUser[userId] = storeId;
  else delete byUser[userId];
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({ ...data, rememberedStoreIdByUserId: byUser })
  );
};

// The user's saved column config for a table (the writable layer). `{}` when
// the user has never customised it — resolution then falls through to
// global/default/TanStack.
export const getUserTableConfig = (
  userId: string,
  tableId: string
): LayeredConfig =>
  readAppData().tableConfigByUserId?.[userId]?.[tableId] ?? {};

// Persist the user's config for a table. An empty config removes the entry
// (rather than storing `{}`) so app data does not accumulate empties once a
// user resets to default.
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

// Device-local label-printer USB preference (spec/settings OMS-REG-SET-05.22):
// read and written only here; never part of LabelPrinterSettingsInput.
export const getLabelPrinterUseUsb = (): boolean =>
  readAppData().labelPrinterUseUsb ?? false;

export const setLabelPrinterUseUsb = (useUsb: boolean): void => {
  const data = readAppData();
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({ ...data, labelPrinterUseUsb: useUsb })
  );
};

// Device-local mock-scanner toggle (spec/settings rules § Devices — barcode
// scanner): read and written only here; never on the wire.
export const getMockBarcodeScannerEnabled = (): boolean =>
  readAppData().mockBarcodeScannerEnabled ?? false;

export const setMockBarcodeScannerEnabled = (enabled: boolean): void => {
  const data = readAppData();
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({ ...data, mockBarcodeScannerEnabled: enabled })
  );
};

// A LayeredConfig is empty when no band holds any (non-empty) TableConfig
// field. Exported so the promote-to-global path (createTableConfig) applies the
// SAME "nothing to save" rule this module uses to drop a user entry — one
// definition, no drift.
export const isEmptyLayeredConfig = (config: LayeredConfig): boolean =>
  Object.values(config).every(
    band => !band || Object.values(band).every(field => field == null)
  );
