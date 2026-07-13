import type {
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  VisibilityState,
} from '@tanstack/solid-table';

// Per-table column configuration the user can change: order, sizing, pinning, and
// visibility. These are EXACTLY TanStack's own state shapes (kdd/type-safety — no
// remapping), so a stored config feeds `state.*` directly and a `on*Change` writes
// straight back. `visibility` is sparse "show" semantics: a column absent from the map
// is visible; only `false` hides it (kdd/table-state — lean on TanStack's own model).
export type TableConfig = {
  columnOrder?: ColumnOrderState;
  columnSizing?: ColumnSizingState;
  columnPinning?: ColumnPinningState;
  columnVisibility?: VisibilityState;
};

// The keys of TableConfig — the four things `setConfig` can write, one per TanStack
// column-state slice. Exported so DataTable/createTableConfig can type `setConfig`'s key.
export type TableConfigKey = keyof TableConfig;

// A config split by breakpoint band. For now only `base` and `compact` (the existing
// breakpoints.compact = 600 threshold). Breakpoints do NOT share: the resolver picks ONE
// band and never falls back across bands (a compact override does not inherit base).
// More bands can be added as fields later without changing the resolver's shape.
export type Band = 'base' | 'compact';
export type LayeredConfig = Partial<Record<Band, TableConfig>>;

// Resolve the effective config for one band from the three precedence layers
// (user > global > default). Per-field: each of the four keys is taken WHOLE from the
// first layer that provides it at THIS band — order/sizing/pinning/visibility are
// independent, so a user who only reordered still gets the global (or default) widths.
// No cross-band fallback (breakpoints don't share) and no `default` from the columnDef —
// an unset field is simply omitted, and TanStack falls back to the `columns` prop
// (all visible, declaration order, auto widths, no pins).
export const resolveTableConfig = (
  band: Band,
  layers: {
    default?: LayeredConfig;
    global?: LayeredConfig;
    user?: LayeredConfig;
  },
): TableConfig => {
  const user = layers.user?.[band];
  const global = layers.global?.[band];
  const def = layers.default?.[band];
  const pick = <K extends TableConfigKey>(key: K): TableConfig[K] =>
    user?.[key] ?? global?.[key] ?? def?.[key];
  return {
    columnOrder: pick('columnOrder'),
    columnSizing: pick('columnSizing'),
    columnPinning: pick('columnPinning'),
    columnVisibility: pick('columnVisibility'),
  };
};

// The API's globalTableConfigs blob, parsed: a per-tableId map of layered config. This is
// ONE value for the whole store (every table narrows to its own tableId), so it's fetched
// once and shared — see createTableConfig's module-level store-scoped resource.
export type GlobalTableConfigs = Record<string, LayeredConfig>;

// Parse the API's globalTableConfigs JSON blob into the whole per-tableId map. The blob is
// free-form JSON from the server; on anything unexpected we fall back to an empty map
// rather than throwing — each table then uses user/default/TanStack fallback. Trusted-layer
// cast: the blob's shape is the server's contract, and bad JSON degrades to `{}`.
export const parseGlobalTableConfigs = (json: string | undefined): GlobalTableConfigs => {
  if (!json) return {};
  try {
    return (JSON.parse(json) as GlobalTableConfigs) ?? {};
  } catch {
    return {};
  }
};
