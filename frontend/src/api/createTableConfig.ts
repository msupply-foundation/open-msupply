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
import {
  getUserTableConfig,
  setUserTableConfig,
  isEmptyLayeredConfig,
} from '../appData';
import {
  currentStoreId,
  currentUserId,
  hasPermission,
} from '../store/storeContext';
import { isCentralServer } from './serverInfo';
import { createStoreScopedResource } from './storeScopedResource';
import { graphqlFetch } from './graphql';
import {
  GlobalTableConfigs,
  SaveGlobalTableConfigs,
} from './tableConfig.generated';

// App-glue that turns the three config layers (default → global → user) plus
// the current breakpoint band into ONE resolved `config` for DataTable, and a
// `setConfig` that writes the user layer. It lives in src/api (not src/ui)
// because it wires app-specific sources — this app's store context, appData,
// and GraphQL query — onto DataTable's generic config/setConfig props
// (kdd/table-state: the library table stays dumb; the page owns state).
// DataTable never sees the layers, only the resolved value.
//
// - Global layer: the store-scoped globalTableConfigs blob, fetched lazily and
// refetched on store change via createStoreScopedResource, then parsed for this
// tableId. Read via noSuspense() so a pending first load never trips an
// ancestor <Suspense> (no remount). - User layer: appData/localStorage, keyed
// by user + tableId; the ONLY writable layer. - Band: the compact media query
// (base | compact). Breakpoints do not share.

export type TableConfigController = {
  /**
   * The resolved config for the current band — feed straight into DataTable's
   * `config`.
   */
  config: () => TableConfig;
  /**
   * Write one config field to the user layer at the current band (a resolved
   * value, not
   *  an updater — DataTable resolves TanStack's updater before calling this). */
  setConfig: <K extends TableConfigKey>(key: K, value: TableConfig[K]) => void;
  /**
   * Whether the table's layout equals its default at the current band — i.e.
   * the user layer holds no overrides (writing `undefined` through setConfig,
   * as the table's Reset does, counts as no override). Drives the Settings
   * popover's "Reset table to default" disabled state (visible but disabled at
   * default — ui-standards § tables → column management); pass as DataTable's
   * `configIsDefault`. Reactive: re-evaluates on every user-layer write and on
   * band changes.
   */
  isConfigDefault: () => boolean;
  /**
   * Whether the current user may save this table's layout as the shared
   * global default — central server AND EDIT_CENTRAL_DATA (the same gate the
   * reference client uses; the server enforces it regardless). REACTIVE: reads
   * the central-server + permission signals, so it flips when either resolves
   * after construction (isCentralServer starts false and is set by an async
   * startup probe). Drive the action's visibility off this — pass
   * `saveGlobalTableConfig` to the table only when it returns true.
   */
  canSaveGlobalDefault: () => boolean;
  /**
   * Promote this user's current layout (the whole layered user config for this
   * table — all bands) to the store's GLOBAL default, shared install-wide via
   * sync. Central-server + EDIT_CENTRAL_DATA only (gate this on
   * `canSaveGlobalDefault`); the server enforces both. Resolves to `true` on
   * success, `false` on any failure. On success the shared global-config
   * resource is refetched so the new default is live immediately for every
   * table (including this one, whose user layer still wins on top).
   */
  saveGlobalTableConfig: () => Promise<boolean>;
};

// The global layer is ONE store-scoped query for the whole app: the
// globalTableConfigs blob holds EVERY table's config, and each table just
// narrows to its own tableId. So the resource is created ONCE at module scope
// (not per createTableConfig call) — that's what makes
// createStoreScopedResource's singleton/dedup real: N tables share one lazy
// fetch, refetched on store change. (Creating it inside createTableConfig would
// build a new singleton per table and defeat the dedup.) The fetcher returns
// the whole parsed map as a 0-or-1 element list to fit the resource's T[]
// shape.
const globalConfigsResource = createStoreScopedResource<GlobalTableConfigsMap>(
  currentStoreId,
  async storeId => {
    const result = await graphqlFetch(GlobalTableConfigs, { storeId });
    if (result.kind !== 'success') return undefined;
    return [
      parseGlobalTableConfigs(result.data.preferences.globalTableConfigs),
    ];
  }
);
const globalConfigs = (): GlobalTableConfigsMap =>
  globalConfigsResource.noSuspense()[0] ?? {};

// The gate for promoting a layout to the shared global default (central server
// AND EDIT_CENTRAL_DATA) — the same rule the reference client uses; the server
// enforces it regardless. Reactive (both sources are signals). Internal to this
// module: exposed per-controller as `canSaveGlobalDefault` so a page reads the
// gate off the same object it gets the save action from, rather than importing
// a free function and re-deriving the rule. Not table-specific, so it's defined
// once at module scope.
const canSaveGlobalDefault = (): boolean =>
  isCentralServer() && hasPermission('EDIT_CENTRAL_DATA');

export function createTableConfig(options: {
  tableId: string;
  /**
   * Optional lowest layer — a table's non-fallback defaults
   * (start-hidden/pinned, etc.).
   */
  defaultConfig?: LayeredConfig;
}): TableConfigController {
  const { tableId, defaultConfig } = options;

  // Current breakpoint band. Only `compact` exists for now; everything else is
  // `base`.
  const isCompact = createMediaQuery(mediaQuery.compact);
  const band = (): Band => (isCompact() ? 'compact' : 'base');

  // Global layer: this table's slice of the shared, module-level
  // global-configs map. Reading it arms the shared lazy fetch (deduped across
  // all tables).
  const global = (): LayeredConfig | undefined => globalConfigs()[tableId];

  // User layer: read from appData, re-read on every write via a version bump
  // (appData is plain localStorage, not reactive). Keyed by the current user;
  // empty until customised.
  const [userVersion, bumpUser] = createSignal(0);
  const user = (): LayeredConfig => {
    userVersion(); // track: writes bump this so the memo recomputes
    const userId = currentUserId();
    return userId ? getUserTableConfig(userId, tableId) : {};
  };

  const config = createMemo(() =>
    resolveTableConfig(band(), {
      default: defaultConfig,
      global: global(),
      user: user(),
    })
  );

  // DataTable already resolved TanStack's functional updater against the
  // current value, so `value` is concrete — we just persist it into the user
  // layer at the current band.
  const setConfig = <K extends TableConfigKey>(
    key: K,
    value: TableConfig[K]
  ) => {
    const userId = currentUserId();
    if (!userId) return; // no user → nowhere to persist; ignore (shouldn't happen in-app)
    const currentBand = band();
    const existing = getUserTableConfig(userId, tableId);
    const nextConfig: LayeredConfig = {
      ...existing,
      [currentBand]: { ...existing[currentBand], [key]: value },
    };
    setUserTableConfig(userId, tableId, nextConfig);
    bumpUser(v => v + 1);
  };

  // No user overrides at the current band → the layout is at its default.
  // `== null` also treats explicit `undefined` writes (the table's Reset) as
  // cleared, matching appData's isEmptyLayeredConfig rule.
  const isConfigDefault = (): boolean => {
    const bandConfig = user()[band()];
    return (
      !bandConfig || Object.values(bandConfig).every(value => value == null)
    );
  };

  // Promote the user's current layout for THIS table to the shared global
  // default. Mirrors the reference client (useSaveGlobalTableConfig): take the
  // whole current global blob, splice in this table's user-layer config (or
  // drop the key when the user has cleared it back to defaults, so the stored
  // blob never accumulates empty objects), and send the FULL blob —
  // upsertPreferences replaces globalTableConfigs wholesale. On success refetch
  // the shared resource so the new global layer is live without a reload.
  const saveGlobalTableConfig = async (): Promise<boolean> => {
    const storeId = currentStoreId();
    const userId = currentUserId();
    if (!storeId || !userId) return false;

    const current = globalConfigs();
    const userConfig = getUserTableConfig(userId, tableId);
    const { [tableId]: _existing, ...rest } = current;
    const nextConfigs: GlobalTableConfigsMap = isEmptyLayeredConfig(userConfig)
      ? rest
      : { ...rest, [tableId]: userConfig };

    const result = await graphqlFetch(SaveGlobalTableConfigs, {
      storeId,
      // globalTableConfigs is the JSON scalar (typed `unknown`) — the server
      // stores/returns a real object, so send the map object directly.
      input: { globalTableConfigs: nextConfigs },
    });
    if (
      result.kind !== 'success' ||
      !result.data.centralServer.preferences.upsertPreferences.ok
    )
      return false;

    await globalConfigsResource.refetch();
    return true;
  };

  return {
    config,
    setConfig,
    isConfigDefault,
    canSaveGlobalDefault,
    saveGlobalTableConfig,
  };
}
