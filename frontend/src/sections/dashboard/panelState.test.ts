import { describe, expect, it } from 'vitest';
import { countPanelState } from './panelState';

// Panel-level failure isolation (spec/dashboard ui-surface S2). Criteria
// cited from spec/dashboard/acceptance.md.

describe('countPanelState', () => {
  // AC-D2 — a family the user cannot read shows a permission error in place
  // of a value (never a number); other outcomes are unaffected.
  it('AC-D2: forbidden maps to an in-panel permission error, not a value', () => {
    expect(countPanelState({ kind: 'forbidden' })).toEqual({
      status: 'error',
      messageKey: 'error.no-permission',
    });
  });

  it('AC-D2: an unexpected failure shows a generic in-panel error', () => {
    expect(countPanelState({ kind: 'error' })).toEqual({
      status: 'error',
      messageKey: 'error.no-data',
    });
  });

  // ui-surface S2 — a panel is loading until its own query resolves; a
  // resolved family shows its stats.
  it('loads until the family resolves, then shows the stats', () => {
    expect(countPanelState(undefined)).toEqual({ status: 'loading' });
    expect(countPanelState({ kind: 'ready', data: { n: 1 } })).toEqual({
      status: 'ready',
    });
  });
});
