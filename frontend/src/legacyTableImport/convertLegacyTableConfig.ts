import type {
  LegacyTableConfigMap,
  LegacyTableMapping,
} from 'virtual:legacy-table-config-map';
import type {
  Density,
  TableConfig,
  ViewMode,
} from '../ui/elements/table/tableConfig';

/*
 * Converts React front end (`client/`) table layouts into this UI's
 * TableConfig, through the legacy table config map (#2072). The server's
 * migration fragment converts the shared layouts with the same rules
 * (server/repository/src/migrations/v3_04_01/
 * migrate_global_table_configs_to_default_configs/convert.rs), and both run
 * that fragment's conversion_fixtures.json, so a rule changed here needs the
 * same change there.
 *
 * An old layout is a material-react-table `ManagedTableState`: columnOrder,
 * columnSizing, columnPinning, columnVisibility, density, viewMode and
 * grouping, each present only if the user changed it.
 *
 * Lazy-only (vite/lazyChunkGuard.ts): reached only from the import chunk.
 */

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The entry's own `columns` first, then the longest matching prefix;
// undefined when the column is dropped.
const newColumnId = (
  old: string,
  entry: LegacyTableMapping,
  prefixes: Readonly<Record<string, string>>
): string | undefined => {
  if (Object.hasOwn(entry.columns, old)) return entry.columns[old] ?? undefined;
  let match: string | undefined;
  for (const prefix of Object.keys(prefixes)) {
    if (old.startsWith(prefix) && (!match || prefix.length > match.length)) {
      match = prefix;
    }
  }
  return match === undefined
    ? undefined
    : `${prefixes[match]}${old.slice(match.length)}`;
};

// A list of column ids, mapped. Several old columns can map to one new column
// (a column whose old id is its translated header has one key per
// translation), so the first occurrence wins.
const mapColumnList = (
  value: unknown,
  entry: LegacyTableMapping,
  prefixes: Readonly<Record<string, string>>
): string[] => {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const old of value) {
    if (typeof old !== 'string') continue;
    const id = newColumnId(old, entry, prefixes);
    if (id !== undefined && !result.includes(id)) result.push(id);
  }
  return result;
};

// By code point, as Rust orders strings. JavaScript's default sort compares
// UTF-16 code units, which differs for characters outside the BMP.
const byCodePoint = (a: string, b: string): number => {
  const left = Array.from(a);
  const right = Array.from(b);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const diff =
      (left[i].codePointAt(0) as number) - (right[i].codePointAt(0) as number);
    if (diff !== 0) return diff;
  }
  return left.length - right.length;
};

// A column id → value object, mapped, keeping the values `keep` returns. When
// several old columns map to one new column, the old id that sorts first by
// code point wins, so the result doesn't depend on the order the object was
// stored in.
const mapColumnObject = <T>(
  value: unknown,
  entry: LegacyTableMapping,
  prefixes: Readonly<Record<string, string>>,
  keep: (value: unknown) => T | undefined
): Record<string, T> => {
  if (!isObject(value)) return {};
  const result: Record<string, T> = {};
  for (const old of Object.keys(value).sort(byCodePoint)) {
    const id = newColumnId(old, entry, prefixes);
    if (id === undefined || Object.hasOwn(result, id)) continue;
    const kept = keep(value[old]);
    if (kept !== undefined) result[id] = kept;
  }
  return result;
};

// px → rem at the base root font size (16px), rounded to 2 decimal places, as
// pxToRem (src/ui/utils/rem.ts) does. The live font size isn't used: the
// server converts with the same fixed 16.
const pxToRem = (px: unknown): number | undefined =>
  typeof px === 'number' && Number.isFinite(px) && px > 0
    ? Math.round((px / 16) * 100) / 100
    : undefined;

const DENSITIES: readonly Density[] = ['compact', 'comfortable', 'spacious'];
const VIEW_MODES: readonly ViewMode[] = ['table', 'card'];

const oneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined => allowed.find(candidate => candidate === value) ?? undefined;

/**
 * One old table's layout as a TableConfig, or undefined if nothing in it
 * carries over (it isn't an object, or every setting is empty once its
 * columns are mapped).
 */
export const convertTable = (
  old: unknown,
  entry: LegacyTableMapping,
  prefixes: Readonly<Record<string, string>>
): TableConfig | undefined => {
  if (!isObject(old)) return undefined;
  const config: TableConfig = {};

  const order = mapColumnList(old.columnOrder, entry, prefixes);
  if (order.length > 0) config.columnOrder = order;

  const sizing = mapColumnObject(old.columnSizing, entry, prefixes, pxToRem);
  if (Object.keys(sizing).length > 0) config.columnSizing = sizing;

  const oldPinning = isObject(old.columnPinning) ? old.columnPinning : {};
  const left = mapColumnList(oldPinning.left, entry, prefixes);
  const right = mapColumnList(oldPinning.right, entry, prefixes);
  if (left.length > 0 || right.length > 0) {
    config.columnPinning = {
      ...(left.length > 0 && { left }),
      ...(right.length > 0 && { right }),
    };
  }

  const visibility = mapColumnObject(
    old.columnVisibility,
    entry,
    prefixes,
    shown => (typeof shown === 'boolean' ? shown : undefined)
  );
  if (Object.keys(visibility).length > 0) config.columnVisibility = visibility;

  const density = oneOf(old.density, DENSITIES);
  if (density) config.viewDensity = density;
  const viewMode = oneOf(old.viewMode, VIEW_MODES);
  if (viewMode) config.viewMode = viewMode;

  // This UI only ever stores `true`: grouping off is its default.
  const grouped = Array.isArray(old.grouping) && old.grouping.length > 0;
  if (grouped && entry.groupRows === true) config.groupRows = true;

  return Object.keys(config).length > 0 ? config : undefined;
};

/**
 * Old layouts by old table id → TableConfigs by this UI's table id. Entries
 * are applied in map order and the first to produce a layout for a table
 * wins; an old table the map doesn't list is skipped.
 */
export const convertTables = (
  old: Readonly<Record<string, unknown>>,
  map: LegacyTableConfigMap
): Record<string, TableConfig> => {
  const prefixes = map.columnPrefixes ?? {};
  const result: Record<string, TableConfig> = {};
  for (const entry of map.tables) {
    if (Object.hasOwn(result, entry.to)) continue;
    if (!Object.hasOwn(old, entry.from)) continue;
    const config = convertTable(old[entry.from], entry, prefixes);
    if (config) result[entry.to] = config;
  }
  return result;
};
