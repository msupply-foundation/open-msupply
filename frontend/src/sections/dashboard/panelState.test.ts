import { describe, expect, it } from 'vitest';
import { countPanelState } from './panelState';

// Panel-level failure isolation (spec/dashboard ui-surface S2).
// Behaviours cited from spec/dashboard/cases/.

describe('countPanelState', () => {
  // OMS-REG-DB-01.60 (residual path) — a family whose permission went away
  // error in place of a value (never a number); other outcomes are unaffected.
  it('OMS-REG-DB-01.60: forbidden maps to an in-panel permission error, not a value', () => {
    expect(countPanelState({ kind: 'forbidden' })).toEqual({
      status: 'error',
      messageKey: 'error.no-permission',
    });
  });

  it('an unexpected failure shows a generic in-panel error', () => {
    expect(countPanelState({ kind: 'error' })).toEqual({
      status: 'error',
      messageKey: 'error.no-data',
    });
  });

  // ui-surface S2 — a panel is loading until its own query resolves; a resolved
  // family shows its stats.
  it('loads until the family resolves, then shows the stats', () => {
    expect(countPanelState(undefined)).toEqual({ status: 'loading' });
    expect(countPanelState({ kind: 'ready', data: { n: 1 } })).toEqual({
      status: 'ready',
    });
  });
});
