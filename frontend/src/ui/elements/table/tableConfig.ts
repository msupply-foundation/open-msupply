import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  VisibilityState,
} from '@tanstack/solid-table';

// Per-table column configuration the user can change: order, width, pinning, and
// visibility.
// These are exactly TanStack's own state shapes (kdd/type-safety — no remapping),
// so a stored config feeds the table directly and a table change is stored directly.
//
// Persistence has two layers, mirroring Open mSupply:
//   1. the user's own edits, kept in app data (localStorage), keyed by user id +
//      tableId — this is what "remembering it for the user" means; and
//   2. a shared default fetched from the API (store preferences' globalTableConfigs),
//      keyed by tableId.
// A hardcoded default (the columns as the page declares them) sits underneath both.
// Precedence when the table initialises: user config → API global default →
// hardcoded default. Only the user layer is written to here; the API layer is
// read-only in this build (the schema has no save-config mutation).
export type TableConfig = {
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnPinning?: ColumnPinningState;
  columnVisibility?: VisibilityState;
};

// --- App data (localStorage), the user layer -------------------------------------

// One app-data key holds every table's config for every user:
//   { tableConfigByUserId: { [userId]: { [tableId]: TableConfig } } }
// Keyed by user id so a shared device does not leak one user's layout to another
// (same pattern as previousStoreIdByUserId in appData.ts). Trusted layer for the
// read cast: this module is the only reader/writer of the key.
type TableConfigStore = {
  tableConfigByUserId?: Record<string, Record<string, TableConfig>>;
};

const APP_DATA_KEY = 'openMsupplyAppData';

const readStore = (): TableConfigStore => {
  try {
    return JSON.parse(localStorage.getItem(APP_DATA_KEY) ?? '{}') as TableConfigStore;
  } catch {
    return {};
  }
};

export const getUserTableConfig = (userId: string, tableId: string): TableConfig =>
  readStore().tableConfigByUserId?.[userId]?.[tableId] ?? {};

// Persist the user's config for a table. An empty config removes the entry so app
// data does not fill with `{}` once a user resets everything to default.
export const setUserTableConfig = (
  userId: string,
  tableId: string,
  config: TableConfig
): void => {
  const store = readStore();
  const forUser = { ...store.tableConfigByUserId?.[userId] };
  if (isEmptyConfig(config)) delete forUser[tableId];
  else forUser[tableId] = config;
  localStorage.setItem(
    APP_DATA_KEY,
    JSON.stringify({ ...store, tableConfigByUserId: { ...store.tableConfigByUserId, [userId]: forUser } })
  );
};

const isEmptyConfig = (config: TableConfig): boolean =>
  !config.columnOrder &&
  !config.columnSizing &&
  !config.columnPinning &&
  !config.columnVisibility;

// --- Merge with the API global default -------------------------------------------

// The config the table should start from: the user's saved layer laid over the
// API global default (already narrowed to this tableId by the caller). Each field
// is taken whole from whichever layer first provides it — order/sizing/pinning are
// independent, so a user who only reordered still gets the global default widths.
export const resolveTableConfig = (
  user: TableConfig,
  globalDefault: TableConfig | undefined
): TableConfig => ({
  columnOrder: user.columnOrder ?? globalDefault?.columnOrder,
  columnSizing: user.columnSizing ?? globalDefault?.columnSizing,
  columnPinning: user.columnPinning ?? globalDefault?.columnPinning,
  columnVisibility: user.columnVisibility ?? globalDefault?.columnVisibility,
});

// Parse the API's globalTableConfigs JSON blob (a Record<tableId, TableConfig>) and
// pick this table's entry. The blob is free-form JSON from the server; on anything
// unexpected we fall back to no default rather than throwing.
export const parseGlobalTableConfig = (
  json: string | undefined,
  tableId: string
): TableConfig | undefined => {
  if (!json) return undefined;
  try {
    const all = JSON.parse(json) as Record<string, TableConfig>;
    return all?.[tableId];
  } catch {
    return undefined;
  }
};
