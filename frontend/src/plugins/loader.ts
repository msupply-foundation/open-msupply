import { graphqlFetch } from '../api/graphql';
import { registerPluginTranslations } from '../intl';
import {
  HOST_RUNTIME,
  PLUGIN_API_MIN_SUPPORTED,
  PLUGIN_API_VERSION,
} from '../plugin-sdk/apiVersion';
import { pluginBundleUrl } from './bundleUrl';
import {
  pluginDiagnostics,
  recordPluginDiagnostic,
  type PluginDiagnostic,
} from './diagnostics';
import { FrontendPluginMetadata } from './frontendPluginMetadata.generated';
import { loadedPlugins, registerPlugin, type LoadedPlugin } from './registry';
import { validateLoadedModule } from './validate';

/*
 * The plugin loader (spec/plugins/rules.md § discovery & loading).
 *
 * Discovery → import → validate → register translations → register
 * contributions, per plugin, with EVERY step of every plugin inside its own
 * try/catch. That is the whole design: a plugin cannot fail the app, and it
 * cannot fail a sibling (AC-PLUG-L3). `Promise.allSettled` over the per-plugin
 * pipeline means a rejected import is a data point, not a control-flow event.
 *
 * `loadPlugins` takes every effect it performs as a dependency so the pipeline
 * is testable in node with no network, no DOM, and no real bundle;
 * `ensurePluginsLoaded` is the app's one-line entry point that supplies the
 * real ones exactly once.
 */

/** One discovered plugin, as the metadata query reports it. */
export interface PluginMetadataEntry {
  code: string;
  path: string;
  hash: string;
}

/** What registering ONE already-evaluated module needs. */
export interface RegisterModuleDeps {
  registerTranslations: typeof registerPluginTranslations;
  register: (plugin: LoadedPlugin) => void;
  recordDiagnostic: (diagnostic: PluginDiagnostic) => void;
}

export interface LoadPluginsDeps extends RegisterModuleDeps {
  /**
   * Discovery. Resolves to `undefined` when it failed — the app then runs
   * plugin-less rather than not running.
   */
  fetchMetadata: () => Promise<readonly PluginMetadataEntry[] | undefined>;
  /** Evaluate a bundle at a URL (the real one is a dynamic `import()`). */
  importBundle: (url: string) => Promise<unknown>;
}

export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Validate an evaluated module namespace and register it under `code`:
 * everything after the import, and the ONLY path into the registry.
 *
 * Exported because the dev-only author loop (src/plugins/devPlugins.ts) imports
 * plugin sources itself and must come through exactly this gate — a plugin
 * loaded from source is validated, version-checked, and namespaced identically
 * to an installed bundle, so the dev loop cannot make an invalid plugin appear
 * to work.
 *
 * Returns whether the plugin was registered; every refusal is recorded, so a
 * caller needs the boolean only to report success.
 */
export const acceptPluginModule = (
  code: string,
  imported: unknown,
  deps: RegisterModuleDeps
): boolean => {
  const verdict = validateLoadedModule(code, imported);
  if (verdict.kind === 'refused') {
    deps.recordDiagnostic({
      level: 'error',
      pluginCode: code,
      message: `not loaded — ${verdict.message}`,
    });
    return false;
  }
  for (const warning of verdict.warnings) {
    deps.recordDiagnostic({
      level: 'warning',
      pluginCode: code,
      message: warning,
    });
  }

  // Translations first: a contribution can render the moment it is registered,
  // and a registered contribution whose catalogue had not arrived would flash
  // its raw namespaced keys.
  try {
    deps.registerTranslations(code, verdict.module.translations);
  } catch (error) {
    deps.recordDiagnostic({
      level: 'error',
      pluginCode: code,
      message: `not loaded — translations could not be registered: ${describeError(error)}`,
    });
    return false;
  }

  try {
    deps.register({ code, module: verdict.module });
  } catch (error) {
    deps.recordDiagnostic({
      level: 'error',
      pluginCode: code,
      message: `not loaded — registration failed: ${describeError(error)}`,
    });
    return false;
  }
  return true;
};

const loadOne = async (
  entry: PluginMetadataEntry,
  deps: LoadPluginsDeps
): Promise<void> => {
  const { code } = entry;
  let imported: unknown;
  try {
    imported = await deps.importBundle(pluginBundleUrl(entry.path, entry.hash));
  } catch (error) {
    deps.recordDiagnostic({
      level: 'error',
      pluginCode: code,
      message: `bundle failed to load: ${describeError(error)}`,
    });
    return;
  }
  acceptPluginModule(code, imported, deps);
};

/**
 * Load every discovered plugin. Never rejects: discovery failure and each
 * plugin's own failures are recorded and skipped.
 */
export const loadPlugins = async (deps: LoadPluginsDeps): Promise<void> => {
  let metadata: readonly PluginMetadataEntry[] | undefined;
  try {
    metadata = await deps.fetchMetadata();
  } catch (error) {
    metadata = undefined;
    deps.recordDiagnostic({
      level: 'error',
      message: `plugin discovery threw: ${describeError(error)}`,
    });
  }
  if (!metadata) {
    deps.recordDiagnostic({
      level: 'warning',
      message: 'plugin discovery failed — continuing without plugins',
    });
    return;
  }
  // allSettled, not all: loadOne already contains its own failures, and this
  // guarantees the gate opens even if one ever escapes.
  await Promise.allSettled(metadata.map(entry => loadOne(entry, deps)));
};

/*
 * The app's real dependencies.
 *
 * Discovery is unauthenticated and store-agnostic on the server, so it needs
 * nothing but a reachable backend; a non-success result is a plugin-less app,
 * not an error screen (graphqlFetch has already routed infra failures to the
 * global surfaces).
 */
const appDeps: LoadPluginsDeps = {
  fetchMetadata: async () => {
    // Declare what we are, so the server answers with the bundles this host
    // can load. Sending nothing is not neutral: it means the React UI — served
    // by the same backend at `/old-ui/` — and would get us its bundles.
    const result = await graphqlFetch(FrontendPluginMetadata, {
      host: {
        runtime: HOST_RUNTIME,
        version: PLUGIN_API_VERSION,
        minSupported: PLUGIN_API_MIN_SUPPORTED,
      },
    });
    return result.kind === 'success'
      ? result.data.frontendPluginMetadata
      : undefined;
  },
  // @vite-ignore: the URL is discovered at runtime, so Vite must not try to
  // resolve or pre-bundle it. Shared specifiers inside the bundle
  // (`solid-js`, `@openmsupply/plugin-sdk`) resolve through the host's import
  // map to the host's own live instances (kdd/plugin-loading).
  importBundle: url => import(/* @vite-ignore */ url),
  registerTranslations: registerPluginTranslations,
  register: registerPlugin,
  recordDiagnostic: recordPluginDiagnostic,
};

let started: Promise<void> | undefined;

/**
 * Load plugins once per app lifetime, whoever asks first (the boot gate).
 * Idempotent by holding the promise, so a remount cannot re-import bundles; and
 * it never rejects, so the gate can always open.
 */
export const ensurePluginsLoaded = (): Promise<void> => {
  started ??= (async () => {
    // Published before the load, not after: a walk or a support session can
    // read the handle even when discovery itself fails. Accessors, not
    // snapshots, so the handle stays live (rules § discovery & loading —
    // failures visible in diagnostics; the on-screen surface is still
    // deferred).
    globalThis.__oms__ = {
      PLUGIN_API_VERSION,
      plugins: loadedPlugins,
      diagnostics: pluginDiagnostics,
    };
    await loadPlugins(appDeps);
    /*
     * The author dev loop, AFTER the installed set: a dev plugin whose code
     * collides with an installed one replaces it (that is the point of the
     * override), and the registry's own replace-by-code makes the ordering the
     * whole mechanism.
     *
     * The dynamic import sits inside a statically-false branch in production
     * (import.meta.env.DEV → false), so devPlugins.ts and the generated
     * virtual module are dead-code-eliminated — no dev-loop bytes ship, the
     * same pattern the showcase uses in src/index.tsx.
     */
    if (import.meta.env.DEV) {
      const { loadDevPluginsForApp } = await import('./devPlugins');
      await loadDevPluginsForApp();
    }
  })();
  return started;
};
