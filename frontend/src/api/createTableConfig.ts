import { createMemo, createSignal } from 'solid-js';
import { createMediaQuery } from '../ui/utils/createMediaQuery';
import { mediaQuery } from '../ui/styles/breakpoints';
import {
  resolveTableConfig,
  parseGlobalTableConfigs,
  type Band,
  type GlobalTableConfigs as GlobalTableConfigsMap,
  type LayeredConfig,
  type TableConfig,
  type TableConfigKey,
} from '../ui/elements/table/tableConfig';
import { getUserTableConfig, setUserTableConfig } from '../appData';
import { currentStoreId, currentUserId } from '../store/storeContext';
import { createStoreScopedResource } from './storeScopedResource';
import { graphqlFetch } from './graphql';
import { GlobalTableConfigs } from './tableConfig.generated';

// App-glue that turns the three config layers (default → global → user) plus the current
// breakpoint band into ONE resolved `config` for DataTable, and a `setConfig` that writes
// the user layer. It lives in src/api (not src/ui) because it wires app-specific sources —
// this app's store context, appData, and GraphQL query — onto DataTable's generic
// config/setConfig props (kdd/table-state: the library table stays dumb; the page owns
// state). DataTable never sees the layers, only the resolved value.
//
// - Global layer: the store-scoped globalTableConfigs blob, fetched lazily and refetched
//   on store change via createStoreScopedResource, then parsed for this tableId. Read via
//   noSuspense() so a pending first load never trips an ancestor <Suspense> (no remount).
// - User layer: appData/localStorage, keyed by user + tableId; the ONLY writable layer.
// - Band: the compact media query (base | compact). Breakpoints do not share.

export type TableConfigController = {
  /** The resolved config for the current band — feed straight into DataTable's `config`. */
  config: () => TableConfig;
  /** Write one config field to the user layer at the current band (a resolved value, not
   *  an updater — DataTable resolves TanStack's updater before calling this). */
  setConfig: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
};

// The global layer is ONE store-scoped query for the whole app: the globalTableConfigs
// blob holds EVERY table's config, and each table just narrows to its own tableId. So the
// resource is created ONCE at module scope (not per createTableConfig call) — that's what
// makes createStoreScopedResource's singleton/dedup real: N tables share one lazy fetch,
// refetched on store change. (Creating it inside createTableConfig would build a new
// singleton per table and defeat the dedup.) The fetcher returns the whole parsed map as a
// 0-or-1 element list to fit the resource's T[] shape.
const globalConfigsResource = createStoreScopedResource<GlobalTableConfigsMap>(
  currentStoreId,
  async (storeId) => {
    const result = await graphqlFetch(GlobalTableConfigs, { storeId });
    if (result.kind !== 'success') return undefined;
    return [parseGlobalTableConfigs(result.data.preferences.globalTableConfigs)];
  },
);
const globalConfigs = (): GlobalTableConfigsMap => globalConfigsResource.noSuspense()[0] ?? {};

export function createTableConfig(options: {
  tableId: string;
  /** Optional lowest layer — a table's non-fallback defaults (start-hidden/pinned, etc.). */
  defaultConfig?: LayeredConfig;
}): TableConfigController {
  const { tableId, defaultConfig } = options;

  // Current breakpoint band. Only `compact` exists for now; everything else is `base`.
  const isCompact = createMediaQuery(mediaQuery.compact);
  const band = (): Band => (isCompact() ? 'compact' : 'base');

  // Global layer: this table's slice of the shared, module-level global-configs map.
  // Reading it arms the shared lazy fetch (deduped across all tables).
  const global = (): LayeredConfig | undefined => globalConfigs()[tableId];

  // User layer: read from appData, re-read on every write via a version bump (appData is
  // plain localStorage, not reactive). Keyed by the current user; empty until customised.
  const [userVersion, bumpUser] = createSignal(0);
  const user = (): LayeredConfig => {
    userVersion(); // track: writes bump this so the memo recomputes
    const userId = currentUserId();
    return userId ? getUserTableConfig(userId, tableId) : {};
  };

  const config = createMemo(() =>
    resolveTableConfig(band(), { default: defaultConfig, global: global(), user: user() }),
  );

  // DataTable already resolved TanStack's functional updater against the current value, so
  // `value` is concrete — we just persist it into the user layer at the current band.
  const setConfig = <K extends TableConfigKey>(key: K, value: TableConfig[K]) => {
    const userId = currentUserId();
    if (!userId) return; // no user → nowhere to persist; ignore (shouldn't happen in-app)
    const currentBand = band();
    const existing = getUserTableConfig(userId, tableId);
    const nextConfig: LayeredConfig = {
      ...existing,
      [currentBand]: { ...existing[currentBand], [key]: value },
    };
    setUserTableConfig(userId, tableId, nextConfig);
    bumpUser((v) => v + 1);
  };

  return { config, setConfig };
}
