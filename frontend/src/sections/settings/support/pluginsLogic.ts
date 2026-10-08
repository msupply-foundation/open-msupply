import type { PluginDiagnostic } from '../../../plugins/diagnostics';
import type { LoadedPlugin } from '../../../plugins/registry';

/*
 * The installed-plugins block's pure logic (spec/settings/rules.md § Support;
 * spec/plugins/ui-surface.md § S3 — the administrator-facing surface that
 * section's ⚠️ VERIFY was waiting on).
 *
 * Kept out of the component so the two things that are actually decisions —
 * what counts as a problem, and what order any of it appears in — are
 * unit-testable without rendering.
 */

/** One loaded plugin, as the block lists it. */
export interface PluginRow {
  code: string;
  version: string;
  pluginApiVersion: number;
}

/**
 * The loaded plugins, by code.
 *
 * Sorted rather than left in load order: load order is completion order, so it
 * varies between sessions with network timing, and an administrator comparing
 * two sites should not have to read past that.
 *
 * The version shown is the one the MODULE declares, not the server's row —
 * discovery returns only code, path and hash, and the manifest is what the
 * running code says about itself.
 */
export const pluginRows = (loaded: readonly LoadedPlugin[]): PluginRow[] =>
  loaded
    .map(({ module }) => ({
      code: module.manifest.code,
      version: module.manifest.version,
      pluginApiVersion: module.manifest.pluginApiVersion,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

/**
 * The diagnostics worth showing an administrator: errors and warnings, in the
 * order they happened.
 *
 * `info` is dropped — it is the loader narrating success, which the list above
 * already shows. Identical messages are collapsed, because a plugin refused on
 * a retried discovery would otherwise be reported twice for one fault.
 */
export const pluginProblems = (
  diagnostics: readonly PluginDiagnostic[]
): PluginDiagnostic[] => {
  const seen = new Set<string>();
  return diagnostics.filter(diagnostic => {
    if (diagnostic.level === 'info') return false;
    const key = `${diagnostic.level}:${diagnostic.pluginCode ?? ''}:${diagnostic.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Whether the block has nothing at all to report — no plugin loaded AND
 * nothing went wrong.
 *
 * Distinguished from "none loaded, but here is why" deliberately: a site with
 * no plugins installed and a site whose only plugin was refused both show an
 * empty list, and only the second has something an administrator must act on.
 */
export const hasNothingToReport = (
  rows: readonly PluginRow[],
  problems: readonly PluginDiagnostic[]
): boolean => rows.length === 0 && problems.length === 0;

/** One row of the server's own installed set. */
export interface ServerPluginRow {
  id: string;
  code: string;
  version: string;
  /**
   * What this app can say about the row.
   *
   * `server-side` for a backend plugin, which runs on the server and is never
   * loaded by any client — reporting it as "not loaded here" would read as a
   * fault. `not-loaded` is the state worth spotting: a frontend plugin the
   * server holds and this app did not get, because it was built for a
   * different front end or refused.
   */
  status: 'loaded' | 'not-loaded' | 'server-side';
}

interface InstalledPluginNode {
  id: string;
  code: string;
  version: string;
  kind: 'BACKEND' | 'FRONTEND';
}

/**
 * The server's installed set, each row marked with what this app made of it.
 *
 * The join is on code, which is a plugin's stable identity — deliberately not
 * on version, since the loaded bundle and the row can legitimately differ
 * (discovery hands out the highest version this host accepts, and the module
 * declares its own).
 */
export const serverPluginRows = (
  installed: readonly InstalledPluginNode[],
  loadedCodes: readonly string[]
): ServerPluginRow[] =>
  installed
    .map(({ id, code, version, kind }) => ({
      id,
      code,
      version,
      status:
        kind === 'BACKEND'
          ? ('server-side' as const)
          : loadedCodes.includes(code)
            ? ('loaded' as const)
            : ('not-loaded' as const),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
