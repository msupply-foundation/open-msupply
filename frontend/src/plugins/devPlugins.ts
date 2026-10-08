import { registerPluginTranslations } from '../intl';
import { recordPluginDiagnostic } from './diagnostics';
import {
  acceptPluginModule,
  describeError,
  type RegisterModuleDeps,
} from './loader';
import { loadedPlugins, registerPlugin } from './registry';

/*
 * The author dev loop (kdd/plugin-loading § dev override), DEV ONLY.
 *
 * Two ways to run a plugin the server has not got installed:
 *
 *   source mode  `OMS_PLUGIN_DIRS=../civ-plugins/frontend/latest pnpm dev`
 *                — the plugin's own source joins the host's Vite module graph
 *                  (vite/devPlugins.ts → `virtual:oms-dev-plugins`): one Solid
 *                  runtime, the live in-tree SDK, HMR, no build step.
 *
 *   bundle mode  `?devPlugin=civ_plugins@http://localhost:4173/civ_plugins.js`
 *                — the BUILT bundle is imported cross-origin from wherever the
 *                  author serves their `dist/` (vite preview, with CORS). This
 *                  is the production load path in every respect except
 *                  discovery, so it is what proves a bundle before installing
 *                  it.
 *
 * Both go through `acceptPluginModule` — the SAME validate → translations →
 * register pipeline installed bundles use. A dev plugin gets no exemption from
 * the brand check, the code match, or the API-version gate: the dev loop must
 * not be able to make a plugin the server would refuse look like it works.
 *
 * This module is reached only from the `import.meta.env.DEV` branch in
 * loader.ts, so it and everything it pulls in are dead-code-eliminated from
 * production builds.
 */

/** One `?devPlugin=code@url` request. */
export interface DevPluginOverride {
  code: string;
  /** Absolute URL of the built bundle (`dist/<code>.js`). */
  url: string;
}

export interface ParsedDevPluginOverrides {
  overrides: readonly DevPluginOverride[];
  /** Malformed values, phrased for the author who typed them. */
  problems: readonly string[];
}

/**
 * Parse the `?devPlugin=` query parameter: `code@url`, repeatable and
 * comma-separated (`?devPlugin=a@…,b@…` or `?devPlugin=a@…&devPlugin=b@…`).
 *
 * Pure — the caller passes `location.search` — because this runs on every dev
 * page load and a mis-parse would silently load nothing, or worse, load a
 * bundle under the wrong code. The code is split at the FIRST `@`, so the URL
 * may contain one (`user@host`); a plugin code never can.
 */
export const parseDevPluginOverrides = (
  search: string
): ParsedDevPluginOverrides => {
  const overrides = new Map<string, DevPluginOverride>();
  const problems: string[] = [];
  for (const value of new URLSearchParams(search).getAll('devPlugin')) {
    for (const raw of value.split(',')) {
      const spec = raw.trim();
      if (spec === '') continue;
      const at = spec.indexOf('@');
      const code = at === -1 ? '' : spec.slice(0, at).trim();
      const url = at === -1 ? '' : spec.slice(at + 1).trim();
      if (code === '' || url === '') {
        problems.push(
          `ignored malformed ?devPlugin value "${spec}" — expected code@url`
        );
        continue;
      }
      // Last one wins, so appending to the URL overrides an earlier entry.
      overrides.delete(code);
      overrides.set(code, { code, url });
    }
  }
  return { overrides: [...overrides.values()], problems };
};

export interface DevPluginDeps extends RegisterModuleDeps {
  /** The generated source-mode map (`virtual:oms-dev-plugins`). */
  importSources: () => Promise<
    Readonly<Record<string, () => Promise<unknown>>>
  >;
  /** Evaluate a built bundle at a URL — a cross-origin dynamic `import()`. */
  importBundle: (url: string) => Promise<unknown>;
  /** `location.search`. */
  search: string;
  /** The codes already registered — what an override reports replacing. */
  registeredCodes: () => readonly string[];
}

const registerDevPlugin = async (
  code: string,
  origin: string,
  importModule: () => Promise<unknown>,
  deps: DevPluginDeps
): Promise<void> => {
  // Read BEFORE registering: registerPlugin replaces by code, so afterwards
  // there is nothing left to notice.
  const replaced = deps.registeredCodes().includes(code);
  let imported: unknown;
  try {
    imported = await importModule();
  } catch (error) {
    deps.recordDiagnostic({
      level: 'error',
      pluginCode: code,
      message: `dev plugin failed to load from ${origin}: ${describeError(error)}`,
    });
    return;
  }
  if (!acceptPluginModule(code, imported, deps)) return;
  deps.recordDiagnostic({
    level: 'info',
    pluginCode: code,
    message: replaced
      ? `dev override loaded from ${origin} — REPLACES the plugin already registered under this code`
      : `dev plugin loaded from ${origin}`,
  });
};

/**
 * Load the dev plugins. Called after the installed set, so a code collision
 * resolves in the dev plugin's favour; source mode first, then `?devPlugin=`,
 * so an explicit URL wins over a source directory of the same code.
 *
 * Never rejects — every failure is a diagnostic, exactly as for installed
 * plugins.
 */
export const loadDevPlugins = async (deps: DevPluginDeps): Promise<void> => {
  let sources: Readonly<Record<string, () => Promise<unknown>>> = {};
  try {
    sources = await deps.importSources();
  } catch (error) {
    deps.recordDiagnostic({
      level: 'error',
      message: `dev plugin sources unavailable: ${describeError(error)}`,
    });
  }
  // Sequential: a handful of plugins, and a stable diagnostics order is worth
  // more here than the milliseconds (the installed set is the parallel one).
  for (const [code, importEntry] of Object.entries(sources)) {
    await registerDevPlugin(code, 'source', () => importEntry(), deps);
  }

  const { overrides, problems } = parseDevPluginOverrides(deps.search);
  for (const problem of problems) {
    deps.recordDiagnostic({ level: 'warning', message: problem });
  }
  for (const { code, url } of overrides) {
    await registerDevPlugin(code, url, () => deps.importBundle(url), deps);
  }
};

/** `loadDevPlugins` with the app's real effects (loader.ts's DEV branch). */
export const loadDevPluginsForApp = (): Promise<void> =>
  loadDevPlugins({
    // Dynamic, and in its own module: the virtual specifier only resolves under
    // a Vite config carrying devPluginsPlugin (see devPluginSources.ts).
    importSources: async () => (await import('./devPluginSources')).devPlugins,
    // @vite-ignore: an author-supplied URL on another origin — Vite must not
    // try to resolve or pre-bundle it. The bundle's own bare specifiers resolve
    // through the host's import map, so it shares the host's live instances
    // even cross-origin.
    importBundle: url => import(/* @vite-ignore */ url),
    search: location.search,
    registeredCodes: () => loadedPlugins().map(plugin => plugin.code),
    registerTranslations: registerPluginTranslations,
    register: registerPlugin,
    recordDiagnostic: recordPluginDiagnostic,
  });
