import type { GraphqlResult } from '@/api/graphql';
import { outcomeOf, type WriteOutcome } from '@/domain/selection';
import { t } from '@/intl';
import { sortRows } from '@/list/sortRows';
import type { SortState } from '@/ui/elements/table/columnTypes';
import type {
  ManagedPluginsResult,
  UninstallPluginResult,
} from './plugins.generated';

/*
 * The installed-plugins list's row logic (spec/plugin-management/rules.md ›
 * reading the installed plugins). The list is one read with no server sort, so
 * ordering is done here, over the rows already read.
 */

export type PluginRow =
  ManagedPluginsResult['centralServer']['plugin']['installedPlugins']['nodes'][number];

const SORT_KEYS = ['code', 'version', 'kind', 'runtime'] as const;
export type PluginSortKey = (typeof SORT_KEYS)[number];

/** A sort key the list knows — the URL is hand-editable, so it is checked. */
export const isPluginSortKey = (key: string): key is PluginSortKey =>
  (SORT_KEYS as readonly string[]).includes(key);

/**
 * A row's identity: kind AND id. The id is the bundle author's and is unique
 * per kind only, so a backend and a frontend plugin can share one — and the
 * list must show and select them apart (rules › reading the installed plugins;
 * contract › uninstalling plugins).
 */
export const rowKey = (row: Pick<PluginRow, 'kind' | 'id'>): string =>
  `${row.kind}:${row.id}`;

/** The declared types, comma-separated, in the declared order. */
export const typesText = (row: Pick<PluginRow, 'types'>): string =>
  row.types.join(', ');

/** The runtime as stored; blank for a backend plugin, which has none. */
export const runtimeText = (row: Pick<PluginRow, 'hostRuntime'>): string =>
  row.hostRuntime ?? '';

// Numeric collation compares digit runs as numbers, so `2.9.0` sorts before
// `2.10.0` — "part by part as numbers" (rules › reading the installed
// plugins) — while an unreadable version (`abc`) still sorts as text. The
// other keys compare as the text shown, in the reader's locale.
const versionCollator = new Intl.Collator(undefined, { numeric: true });
const textCollator = new Intl.Collator(undefined);

export const compareVersions = (a: string, b: string): number =>
  versionCollator.compare(a, b);

/**
 * Rows in the order the list shows them. With no sort chosen — or one naming
 * a key the list doesn't know — the server's own order stands: every backend
 * row, then every frontend row, each by id. Kind compares by its translated
 * label (`kindLabel`), runtime by the text shown. Ties keep the server's
 * order (api: list/sortRows is stable).
 */
export const orderPlugins = (
  rows: readonly PluginRow[],
  sort: SortState<string> | undefined,
  kindLabel: (kind: PluginRow['kind']) => string
): PluginRow[] => {
  if (!sort || !isPluginSortKey(sort.key)) return [...rows];
  return sortRows(
    rows,
    { key: sort.key, desc: sort.desc },
    (row, key) => {
      switch (key) {
        case 'code':
          return row.code;
        case 'version':
          return row.version;
        case 'kind':
          return kindLabel(row.kind);
        case 'runtime':
          return runtimeText(row);
      }
    },
    (a, b, key) =>
      (key === 'version' ? versionCollator : textCollator).compare(
        String(a),
        String(b)
      )
  );
};

/** The rows a selection of keys names, in list order. */
export const rowsForKeys = (
  rows: readonly PluginRow[],
  keys: readonly string[]
): PluginRow[] => {
  const wanted = new Set(keys);
  return rows.filter(row => wanted.has(rowKey(row)));
};

/**
 * One row's uninstall, as the bulk delete reports it. Every refusal of this
 * write is a top-level GraphQL error (outcomeOf). One success is not: the
 * server addresses a row by id alone and looks among backend plugins first, so
 * a frontend row whose id a backend row shares removes THAT one instead
 * (contract › uninstalling plugins, wire trap). The answer names the removed
 * row's kind, so that case is this row's refusal, not a silent success
 * (OMS-REG-MNG-07.65).
 */
export const uninstallOutcome = (
  row: Pick<PluginRow, 'kind'>,
  result: GraphqlResult<UninstallPluginResult>
): WriteOutcome =>
  result.kind === 'success' &&
  result.data.centralServer.plugins.uninstallPlugin.kind !== row.kind
    ? { kind: 'refused', reason: t('error.plugin-shared-id-backend-removed') }
    : outcomeOf(result);
