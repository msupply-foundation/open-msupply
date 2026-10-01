import { describe, expect, it } from 'vitest';
import type { PluginRow } from './pluginRows';
import { uninstallRows, type UninstallOne } from './uninstall';

// spec/plugin-management/cases/OMS-REG-MNG-07 — uninstalling

const row = (id: string, kind: PluginRow['kind'] = 'FRONTEND'): PluginRow => ({
  id,
  code: id,
  version: '1.0.0',
  kind,
  types: [],
  hostRuntime: kind === 'BACKEND' ? null : 'solid',
});

describe('OMS-REG-MNG-07.44 — every row uninstalled: nothing refused', () => {
  it('counts each one', async () => {
    const ok: UninstallOne = async () => ({ ok: true });
    expect(await uninstallRows([row('a'), row('b')], ok)).toEqual({
      uninstalled: 2,
      refused: [],
    });
  });
});

describe('OMS-REG-MNG-07.45/.46 — a refused row does not stop the others', () => {
  it('uninstalls the rest and names the refused one with its reason', async () => {
    const gone = row('gone');
    const calls: string[] = [];
    const uninstall: UninstallOne = async id => {
      calls.push(id);
      return id === 'gone'
        ? { ok: false, rejection: { message: 'Plugin not found' } }
        : { ok: true };
    };
    const outcome = await uninstallRows([gone, row('kept')], uninstall);
    expect(calls).toEqual(['gone', 'kept']);
    expect(outcome.uninstalled).toBe(1);
    expect(outcome.refused).toEqual([
      { row: gone, rejection: { message: 'Plugin not found' } },
    ]);
  });
});

describe('rules › uninstalling — rows sharing an id go one call after the other', () => {
  it('never runs two calls for one id at once', async () => {
    let inFlight = 0;
    let overlapped = false;
    const uninstall: UninstallOne = async () => {
      inFlight += 1;
      if (inFlight > 1) overlapped = true;
      await new Promise(resolve => setTimeout(resolve, 1));
      inFlight -= 1;
      return { ok: true };
    };
    await uninstallRows([row('shared', 'BACKEND'), row('shared')], uninstall);
    expect(overlapped).toBe(false);
  });
});
