import { describe, expect, it } from 'vitest';
import type { PluginDiagnostic } from '../../../plugins/diagnostics';
import type { LoadedPlugin } from '../../../plugins/registry';
import {
  hasNothingToReport,
  pluginProblems,
  pluginRows,
  serverPluginRows,
} from './pluginsLogic';

const loaded = (
  code: string,
  version: string,
  pluginApiVersion = 1
): LoadedPlugin =>
  ({
    code,
    module: { manifest: { code, version, pluginApiVersion } },
  }) as LoadedPlugin;

describe('pluginRows', () => {
  it('lists code, version and plugin API for each loaded plugin', () => {
    expect(pluginRows([loaded('civ_plugins', '3.0.0')])).toEqual([
      { code: 'civ_plugins', version: '3.0.0', pluginApiVersion: 1 },
    ]);
  });

  // Load order is completion order, so it moves with network timing between
  // sessions; two sites running the same plugins must read the same.
  it('sorts by code rather than keeping load order', () => {
    const rows = pluginRows([
      loaded('zebra', '1.0.0'),
      loaded('civ_plugins', '3.0.0'),
      loaded('hello_world', '1.0.0'),
    ]);
    expect(rows.map(row => row.code)).toEqual([
      'civ_plugins',
      'hello_world',
      'zebra',
    ]);
  });

  it('is empty when nothing loaded', () => {
    expect(pluginRows([])).toEqual([]);
  });
});

describe('pluginProblems', () => {
  const refused: PluginDiagnostic = {
    level: 'error',
    pluginCode: 'api_too_new',
    message: 'built against plugin API 999',
  };
  const downlevel: PluginDiagnostic = {
    level: 'warning',
    pluginCode: 'old_one',
    message: 'built against an older plugin API',
  };
  const loadedOk: PluginDiagnostic = {
    level: 'info',
    pluginCode: 'civ_plugins',
    message: 'loaded',
  };

  it('keeps errors and warnings, in the order they happened', () => {
    expect(pluginProblems([downlevel, refused])).toEqual([downlevel, refused]);
  });

  // The list above already shows what loaded; repeating it as a "problem"
  // would bury the one line that needs reading.
  it('drops info, which is the loader narrating success', () => {
    expect(pluginProblems([loadedOk, refused])).toEqual([refused]);
  });

  it('collapses an identical message repeated for one fault', () => {
    expect(pluginProblems([refused, refused])).toEqual([refused]);
  });

  it('keeps same-message diagnostics about different plugins', () => {
    const other = { ...refused, pluginCode: 'another' };
    expect(pluginProblems([refused, other])).toEqual([refused, other]);
  });
});

describe('hasNothingToReport', () => {
  it('is true only when nothing loaded and nothing went wrong', () => {
    expect(hasNothingToReport([], [])).toBe(true);
  });

  // The case the empty state must not swallow: no plugin is listed BECAUSE one
  // was refused, which is the opposite of "this site has no plugins".
  it('is false when nothing loaded but something was refused', () => {
    expect(
      hasNothingToReport([], [{ level: 'error', message: 'refused' }])
    ).toBe(false);
  });

  it('is false when a plugin loaded', () => {
    expect(
      hasNothingToReport(
        [{ code: 'civ_plugins', version: '3.0.0', pluginApiVersion: 1 }],
        []
      )
    ).toBe(false);
  });
});

describe('serverPluginRows', () => {
  const frontend = (code: string, version = '1.0.0') => ({
    id: `frontend_${code}`,
    code,
    version,
    kind: 'FRONTEND' as const,
  });
  const backend = (code: string, version = '1.0.0') => ({
    id: `backend_${code}`,
    code,
    version,
    kind: 'BACKEND' as const,
  });

  it('marks a frontend plugin this app loaded', () => {
    expect(
      serverPluginRows([frontend('civ_plugins')], ['civ_plugins'])
    ).toEqual([
      {
        id: 'frontend_civ_plugins',
        code: 'civ_plugins',
        version: '1.0.0',
        status: 'loaded',
      },
    ]);
  });

  // The case the whole block exists for: the server has it, this app did not
  // get it — built for the other front end, or refused.
  it('marks a frontend plugin the server has but this app did not load', () => {
    expect(serverPluginRows([frontend('civ_plugins')], [])[0]?.status).toBe(
      'not-loaded'
    );
  });

  // A backend plugin runs on the server and is never loaded by any client;
  // calling that "not loaded here" would read as a fault.
  it('never reports a backend plugin as missing from this app', () => {
    expect(serverPluginRows([backend('civ_backend')], [])[0]?.status).toBe(
      'server-side'
    );
  });

  // Joined on code, not version: discovery hands out the highest version this
  // host accepts, and the module declares its own.
  it('matches on code even when the versions differ', () => {
    expect(
      serverPluginRows([frontend('civ_plugins', '2.0.0')], ['civ_plugins'])[0]
        ?.status
    ).toBe('loaded');
  });

  it('sorts by code, as the loaded list does', () => {
    const rows = serverPluginRows([frontend('zebra'), backend('alpha')], []);
    expect(rows.map(row => row.code)).toEqual(['alpha', 'zebra']);
  });
});
