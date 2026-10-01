import type { InstalledPluginsResult } from './plugins.generated';

/*
 * The installed-plugins list's row logic (spec/plugin-management/rules.md ›
 * reading the installed plugins). The list is one read with no server sort, so
 * ordering is done here, over the rows already read.
 */

export type PluginRow =
  InstalledPluginsResult['centralServer']['plugin']['installedPlugins']['nodes'][number];

export type PluginSortKey = 'code' | 'version' | 'kind' | 'runtime';

export interface PluginSort {
  key: PluginSortKey;
  desc: boolean;
}

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
// plugins) — while an unreadable version (`abc`) still sorts as text.
const versionCollator = new Intl.Collator(undefined, { numeric: true });
const textCollator = new Intl.Collator(undefined);

export const compareVersions = (a: string, b: string): number =>
  versionCollator.compare(a, b);

/**
 * Rows in the order the list shows them. With no sort chosen the server's own
 * order stands — every backend row, then every frontend row, each by id. Kind
 * and runtime compare by the text shown, so `kindLabel` is the translated
 * label. A stable sort, so ties keep the server's order.
 */
export const sortRows = (
  rows: readonly PluginRow[],
  sort: PluginSort | undefined,
  kindLabel: (kind: PluginRow['kind']) => string
): PluginRow[] => {
  if (!sort) return [...rows];
  const compare = (a: PluginRow, b: PluginRow): number => {
    switch (sort.key) {
      case 'code':
        return textCollator.compare(a.code, b.code);
      case 'version':
        return compareVersions(a.version, b.version);
      case 'kind':
        return textCollator.compare(kindLabel(a.kind), kindLabel(b.kind));
      case 'runtime':
        return textCollator.compare(runtimeText(a), runtimeText(b));
    }
  };
  return [...rows].sort((a, b) => (sort.desc ? -1 : 1) * compare(a, b));
};

/** The rows a selection of keys names, in list order. */
export const rowsForKeys = (
  rows: readonly PluginRow[],
  keys: readonly string[]
): PluginRow[] => {
  const wanted = new Set(keys);
  return rows.filter(row => wanted.has(rowKey(row)));
};
