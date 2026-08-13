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
  // The store the user chose to ALWAYS open at sign-in (spec/startup rules
  // § SL-9): saved when they answer Yes to the selection screen's "Always open
  // this store?" prompt. Per user per device, like previousStoreIdByUserId —
  // a machine in the pharmacy opens the pharmacy store, the warehouse machine
  // the warehouse store, whoever's account is shared between them.
  alwaysOpenStoreIdByUserId?: Record<string, string>;
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
  // The last username to log in successfully on this device (spec/startup rules
  // § Authentication). Deliberately NOT keyed by user id, unlike the two
  // user-keyed entries above: it answers "who used this device last", which is
  // asked on the login page, before any user is known. The password is never
  // persisted.
  lastLoginUsername?: string;
  // The rows-per-page a fresh visit starts at (spec/ui-standards/conventions.md
  // § View state; issue #680): one value per user for the whole app — a "how
  // much do I want to see at once" preference about the user, not about any one
  // list. User-keyed like tableConfigByUserId so a shared device does not leak
  // one user's choice to another (the reference app remembers device-wide;
  // spec/DIVERGENCES.md records the delta). Every change is recorded, so an
  // explicit choice survives even if the app-wide default ever moves.
  pageSizeByUserId?: Record<string, number>;
};

const APP_DATA_KEY = 'open-mSupply-app-data';

const readAppData = (): AppData => {
  try {
    return JSON.parse(localStorage.getItem(APP_DATA_KEY) ?? '{}') as AppData;
  } catch {
    return {};
  }
};

// Every writer goes through here, guarded for the same reason the read is:
// localStorage is absent in the node test environment and can throw in a
// browser (private mode, disabled or full storage). Nothing stored here is
// load-bearing — a remembered store, table layout, device preference or
// username — so losing a write is always better than breaking the caller. That
// matters most for lastLoginUsername, which is written on the login path
// (authContext.login).
const writeAppData = (next: AppData): void => {
  try {
    localStorage.setItem(APP_DATA_KEY, JSON.stringify(next));
  } catch {
    // Best-effort: the app runs the same, it just won't remember this.
  }
};

export const getPreviousStoreId = (userId: string): string | undefined =>
  readAppData().previousStoreIdByUserId?.[userId];

export const recordPreviousStoreId = (
  userId: string,
  storeId: string
): void => {
  const data = readAppData();
  writeAppData({
    ...data,
    previousStoreIdByUserId: {
      ...data.previousStoreIdByUserId,
      [userId]: storeId,
    },
  });
};

// The user's always-open store on this device (spec/startup rules § SL-9), or
// undefined when they have never answered Yes to the prompt. The store guard
// treats a value that no longer names one of the user's stores as absent.
export const getAlwaysOpenStoreId = (userId: string): string | undefined =>
  readAppData().alwaysOpenStoreIdByUserId?.[userId];

export const recordAlwaysOpenStoreId = (
  userId: string,
  storeId: string
): void => {
  const data = readAppData();
  writeAppData({
    ...data,
    alwaysOpenStoreIdByUserId: {
      ...data.alwaysOpenStoreIdByUserId,
      [userId]: storeId,
    },
  });
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
  writeAppData({
    ...data,
    tableConfigByUserId: { ...data.tableConfigByUserId, [userId]: forUser },
  });
};

// Device-local label-printer USB preference (spec/settings OMS-REG-SET-05.22):
// read and written only here; never part of LabelPrinterSettingsInput.
export const getLabelPrinterUseUsb = (): boolean =>
  readAppData().labelPrinterUseUsb ?? false;

export const setLabelPrinterUseUsb = (useUsb: boolean): void => {
  writeAppData({ ...readAppData(), labelPrinterUseUsb: useUsb });
};

// Device-local mock-scanner toggle (spec/settings rules § Devices — barcode
// scanner): read and written only here; never on the wire.
export const getMockBarcodeScannerEnabled = (): boolean =>
  readAppData().mockBarcodeScannerEnabled ?? false;

export const setMockBarcodeScannerEnabled = (enabled: boolean): void => {
  writeAppData({ ...readAppData(), mockBarcodeScannerEnabled: enabled });
};

// The username the login page prefills (spec/startup rules § Authentication).
// Undefined until someone has logged in successfully on this device; an
// explicit logout deliberately leaves it, so the returning user confirms a name
// rather than retyping it.
export const getLastLoginUsername = (): string | undefined =>
  readAppData().lastLoginUsername;

export const recordLastLoginUsername = (username: string): void => {
  writeAppData({ ...readAppData(), lastLoginUsername: username });
};

// The user's remembered rows-per-page, or undefined when they have never
// changed it — the caller (src/list/pageSize.ts) falls back to the app default.
export const getPreferredPageSize = (userId: string): number | undefined =>
  readAppData().pageSizeByUserId?.[userId];

export const recordPreferredPageSize = (
  userId: string,
  pageSize: number
): void => {
  const data = readAppData();
  writeAppData({
    ...data,
    pageSizeByUserId: { ...data.pageSizeByUserId, [userId]: pageSize },
  });
};

// A LayeredConfig is empty when no band holds any (non-empty) TableConfig
// field. Exported so the promote-to-global path (createTableConfig) applies the
// SAME "nothing to save" rule this module uses to drop a user entry — one
// definition, no drift.
export const isEmptyLayeredConfig = (config: LayeredConfig): boolean =>
  Object.values(config).every(
    band => !band || Object.values(band).every(field => field == null)
  );
