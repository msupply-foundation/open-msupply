/*
 * The plugin loader (spec/plugins/rules.md § discovery & loading, lifecycle;
 * kdd/plugin-loading).
 *
 * Two load paths, one registry:
 *
 * 1. **Dev-link** — in-repo plugin sources under `plugins/<dir>/`, imported
 *    straight into the host module graph when `DEV_PLUGINS` names them. One
 *    `solid-js`, one SDK, real HMR, no build step: this is what "working on a
 *    plugin" means day to day (`DEV_PLUGINS=civ pnpm dev`).
 *    Dead-code-eliminated from production builds — `DEV_PLUGINS` is defined as
 *    `''` there, so the branch and everything it imports drops out (the same
 *    technique the dev-only showcase uses, kdd/showcase-harness).
 *
 * 2. **Installed** — the production path: discover the installed bundles, fetch
 *    each at its content-hash URL, evaluate it as a native ES module, gate on
 *    the plugin-API version, register. ⚠️ This path is implemented but NOT yet
 *    proven end-to-end: a bundle's bare `import 'solid-js'` / `'@openmsupply/
 *    plugin-sdk'` specifiers still need the host to serve
 *    import-map-addressable module URLs (kdd/bundling's R2 externalisation
 *    spike (#770)). `publishHostModules` below is the always-on rendezvous those shim
 *    modules read; the import map itself is the remaining piece.
 *
 * A plugin that fails at any step is SKIPPED: the app continues without it,
 * other plugins are unaffected, and the reason is recorded — never silently
 * swallowed.
 */
import { graphqlFetch } from '../api/graphql';
import { currentStoreId, storeContext } from '../store/storeContext';
import { acceptBundle } from './acceptBundle';
import { createPluginDataStore } from './pluginData';
import { FrontendPluginMetadata } from './pluginApi.generated';
import { registerPlugin } from './registry';
import type { PluginRuntime } from './sdk/pluginRuntime';

/** Why a plugin was skipped — administrator/support-facing (ui-surface S3). */
export interface PluginDiagnostic {
  code: string;
  reason: string;
}

const diagnostics: PluginDiagnostic[] = [];

/** Everything that went wrong during loading, in the order it happened. */
export const pluginDiagnostics = (): readonly PluginDiagnostic[] => diagnostics;

const skip = (code: string, reason: string): void => {
  diagnostics.push({ code, reason });
  console.error(`Plugin "${code}" skipped: ${reason}`);
};

// ── The session context a contribution's `when` gate reads ───────────────────

/*
 * Built fresh per read so it tracks `storeContext()` — a gate that depends on a
 * store preference re-evaluates when the context lands or the store changes,
 * without the loader knowing anything about gates.
 *
 * `hasPermission` is re-derived here over the raw permission names rather than
 * reusing the store's typed accessor: the SDK's own signature takes a `string`
 * (a plugin can't be compiled against the host's permission union), and
 * widening through a cast would put an `as` in a boundary that doesn't need
 * one.
 */
const slotContext = () => ({
  get storeId() {
    return currentStoreId() ?? '';
  },
  hasPermission: (permission: string): boolean => {
    const me = storeContext()?.me;
    if (!me || me.__typename !== 'UserNode') return false;
    return me.permissions.nodes.some(node =>
      node.permissions.some(held => held === permission)
    );
  },
  get storePreferences(): Readonly<Record<string, unknown>> {
    const context = storeContext();
    return { ...context?.storePreferences, ...context?.preferences };
  },
});

/*
 * The per-plugin runtime handed to each of its contributions. Cached per code
 * so a plugin's data store is one object for the app's lifetime — its identity
 * is `(code, entered store)`, and the store id is read through an accessor, so
 * a store switch reaches it without rebuilding anything.
 */
const runtimes = new Map<string, PluginRuntime>();

export const pluginRuntimeFor = (code: string): PluginRuntime => {
  const existing = runtimes.get(code);
  if (existing) return existing;
  const runtime: PluginRuntime = {
    code,
    data: createPluginDataStore(code, () => currentStoreId() ?? ''),
    context: slotContext(),
  };
  runtimes.set(code, runtime);
  return runtime;
};

// ── Accepting a plugin ───────────────────────────────────────────────────────

/**
 * Put a loaded module through the acceptance decision (`acceptBundle`, pure and
 * unit-tested) and either register it or record why it was skipped.
 *
 * `label` names the plugin in diagnostics — the installed code, or the dev-link
 * directory. `installedAs` is the code the server reported, when there is one.
 */
const register = (
  label: string,
  module: unknown,
  installedAs?: string
): void => {
  const verdict = acceptBundle(module, installedAs);
  if (verdict.kind === 'skipped') return skip(label, verdict.reason);
  registerPlugin(verdict.plugin);
};

// ── Path 1: dev-linked in-repo plugins ──────────────────────────────────────

/*
 * The glob is eager: false and the whole call site is behind `DEV_PLUGINS`, so
 * a production build (where DEV_PLUGINS is the empty string) never reaches it
 * and Rollup drops the plugin sources entirely.
 * `scripts/check-plugin-bundle.mjs` asserts that, per build, rather than
 * trusting it.
 */
const devPluginModules = (): Record<string, () => Promise<unknown>> =>
  import.meta.glob('/plugins/*/src/plugin.tsx');

const loadDevPlugins = async (directories: string[]): Promise<void> => {
  const modules = devPluginModules();
  for (const directory of directories) {
    const path = `/plugins/${directory}/src/plugin.tsx`;
    const load = modules[path];
    if (!load) {
      skip(directory, `no dev-linked plugin source at ${path}`);
      continue;
    }
    try {
      register(directory, await load());
    } catch (error) {
      skip(directory, `failed to evaluate: ${String(error)}`);
    }
  }
};

// ── Path 2: installed bundles ───────────────────────────────────────────────

/*
 * Where the server serves plugin files:
 * `/frontend_plugins/{plugin_code}/{filename}` (its actix route). The dev server
 * proxies this prefix to the backend (vite.config.ts), so the production load
 * path can be exercised locally.
 */
const FRONTEND_PLUGINS_ROUTE = '/frontend_plugins';

const loadInstalledPlugins = async (): Promise<void> => {
  const result = await graphqlFetch(
    FrontendPluginMetadata,
    {},
    {
      // Discovery failing must not trip the global unexpected-error modal: a
      // server without the plugin surface, or a transient failure, means "no
      // plugins" — the app is fine, it just isn't extended.
      background: true,
    }
  );
  if (result.kind !== 'success') return;
  const installed = result.data.frontendPluginMetadata;
  if (installed.length === 0) return;

  // The host's singletons must be at the rendezvous BEFORE any bundle
  // evaluates: an installed bundle's bare `solid-js` specifier resolves through
  // it. Lazy, so a deployment with no plugins never loads it (see hostModules).
  const { publishHostModules } = await import('./hostModules');
  publishHostModules();

  for (const entry of installed) {
    /*
     * `path` is `{code}/{entry_point}` — RELATIVE, with no leading slash and no
     * route prefix (the server builds it as `format!("{code}/{entry_point}")`).
     * It must be prefixed with the serve route, and rooted: passed through bare,
     * `import()` would resolve it against the importing chunk's own URL
     * (`/assets/civ_plugins/…`) and 404.
     *
     * The content hash is the cache token: unchanged bytes are an immutable
     * cache hit, changed bytes are a new URL (rules § caching & updates).
     */
    const url = `${FRONTEND_PLUGINS_ROUTE}/${entry.path}?v=${entry.hash}`;
    try {
      register(entry.code, await import(/* @vite-ignore */ url), entry.code);
    } catch (error) {
      skip(entry.code, `failed to load ${url}: ${String(error)}`);
    }
  }
};

// ── Entry ───────────────────────────────────────────────────────────────────

/*
 * Once per session. Held as the promise, not a boolean, so a second caller
 * during the first load awaits the same work instead of starting a second one.
 */
let loading: Promise<void> | undefined;

/**
 * Load every plugin available to this client. Called from the store guard, once
 * the session and store context are established (a plugin's `when` gates read
 * store preferences, and its data is store-scoped, so neither is meaningful
 * before then).
 *
 * ⚠️ Boot order — the spec's open decision (rules § lifecycle) resolved here
 * as: **fired after store entry, NOT awaited before the first screen
 * renders.** The rule's intent is that contributions don't pop into an
 * already-rendered screen; blocking on it would put a discovery round-trip
 * plus N bundle fetches in front of every screen for every user — including
 * the overwhelmingly common case of a server with no plugins at all.
 * Registration is a signal, so a contribution that arrives late renders as
 * soon as it lands, and in practice plugins are registered long before a user
 * reaches a slot. Worth confirming with a reviewer; if pop-in proves real for
 * a slot, that slot's screen can await `pluginsLoaded()` rather than the whole
 * app paying for it.
 *
 * Never rejects: a plugin failure is a diagnostic, not an app failure.
 */
export const loadPlugins = (): Promise<void> => {
  loading ??= (async () => {
    if (import.meta.env.DEV && DEV_PLUGINS)
      await loadDevPlugins(DEV_PLUGINS.split(',').filter(Boolean));
    await loadInstalledPlugins();
  })();
  return loading;
};

/**
 * Resolves when the session's one load attempt has finished (or immediately).
 */
export const pluginsLoaded = (): Promise<void> => loading ?? Promise.resolve();
