import { describe, expect, it } from 'vitest';
import {
  refetchIndicatorHome,
  showsToolbarRow,
  type ToolbarInputs,
} from './toolbarState';

/*
 * The two rules have to agree: a table renders the refetch indicator in
 * exactly one place. Reading them separately double-rendered it on every
 * table whose host lifts the controls (PR #749 re-review) — the case pinned
 * below by name.
 */

const table = (over: Partial<ToolbarInputs> = {}): ToolbarInputs => ({
  hasFilters: false,
  hasPagination: false,
  controlsLifted: false,
  hasControls: true,
  ...over,
});

describe('showsToolbarRow', () => {
  it('renders the row for a filter bar, a count, or a control of its own', () => {
    expect(showsToolbarRow(table({ hasFilters: true }))).toBe(true);
    expect(showsToolbarRow(table({ hasPagination: true }))).toBe(true);
    expect(showsToolbarRow(table())).toBe(true);
  });

  it('skips it when the cluster would be empty — a modal line table', () => {
    expect(showsToolbarRow(table({ hasControls: false }))).toBe(false);
  });

  it('skips it when the controls are lifted and nothing else fills it', () => {
    expect(showsToolbarRow(table({ controlsLifted: true }))).toBe(false);
  });

  it('keeps it for a lifted table that still has filters or a count', () => {
    expect(
      showsToolbarRow(table({ controlsLifted: true, hasFilters: true }))
    ).toBe(true);
    expect(
      showsToolbarRow(table({ controlsLifted: true, hasPagination: true }))
    ).toBe(true);
  });
});

describe('refetchIndicatorHome', () => {
  it('rides with the cluster in the toolbar row', () => {
    expect(refetchIndicatorHome(table())).toBe('cluster');
  });

  it('rides with the cluster into the host chrome when it is lifted', () => {
    // The regression: the toolbar row is skipped here, but the cluster still
    // renders (portalled), so the indicator must NOT also float.
    expect(refetchIndicatorHome(table({ controlsLifted: true }))).toBe(
      'cluster'
    );
    expect(
      refetchIndicatorHome(table({ controlsLifted: true, hasControls: false }))
    ).toBe('cluster');
  });

  it('floats only when the cluster renders nowhere', () => {
    expect(refetchIndicatorHome(table({ hasControls: false }))).toBe(
      'floating'
    );
  });

  it('never puts it in two places at once', () => {
    for (const hasFilters of [false, true])
      for (const hasPagination of [false, true])
        for (const controlsLifted of [false, true])
          for (const hasControls of [false, true]) {
            const inputs = {
              hasFilters,
              hasPagination,
              controlsLifted,
              hasControls,
            };
            const floats = refetchIndicatorHome(inputs) === 'floating';
            // The cluster renders when the toolbar row does, or when a host
            // took it; floating is exactly the case where neither happens.
            const clusterRenders = showsToolbarRow(inputs) || controlsLifted;
            expect(floats).toBe(!clusterRenders);
          }
  });
});
