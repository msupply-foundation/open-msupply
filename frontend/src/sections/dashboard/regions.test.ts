import { describe, expect, it } from 'vitest';
import type { Component } from 'solid-js';
import {
  DASHBOARD_IDS,
  mergeRegion,
  publishedIds,
  type RegionBuiltIn,
  type RegionContribution,
} from './regions';

// The dashboard's plugin-region semantics (spec/dashboard/ui-surface.md § S3,
// rules.md § extensibility). The dashboard OWNS how contributions merge with
// built-ins and how suppression behaves; it is complete and testable against an
// empty contribution set before the (greenfield) plugins vertical exists.
// Criteria cited from spec/dashboard/acceptance.md.

// A placeholder component — the merge carries it through untouched; its identity
// is never inspected here.
const noop = (() => null) as Component;
const contribution = (
  id: string,
  extra: Partial<RegionContribution> = {}
): RegionContribution => ({ id, Component: noop, ...extra });
const builtIns = (...ids: string[]): RegionBuiltIn[] => ids.map(id => ({ id }));
const ids = (region: ReturnType<typeof mergeRegion>) =>
  region.entries.map(e => e.id);
const NONE: ReadonlySet<string> = new Set();

describe('published ids (AC-D3, ui-surface § S3)', () => {
  // AC-D3 — the built-in set is exactly the three widgets with their documented
  // panels and stats; the ids are the stable public API a contribution anchors
  // to or suppresses.
  it('AC-D3: exposes exactly the three built-in widgets', () => {
    expect(DASHBOARD_IDS.replenishment.id).toBe('replenishment');
    expect(DASHBOARD_IDS.distribution.id).toBe('distribution');
    expect(DASHBOARD_IDS.inventory.id).toBe('inventory');
  });

  it('AC-D3: every published id is unique and dot-scoped under its widget', () => {
    const all = publishedIds();
    // Documented count: 3 widgets + 7 panels + 21 stats = 31 (ui-surface § S3).
    expect(all).toHaveLength(31);
    expect(new Set(all).size).toBe(all.length); // all unique
    // A stat id prefixes its panel, which prefixes its widget.
    expect(all).toContain('inventory.stock-levels.low-stock');
    expect(
      all.filter(id => id.startsWith('replenishment.')).length
    ).toBeGreaterThan(0);
  });
});

describe('mergeRegion — with no contributions', () => {
  // rules § extensibility — the region renders its built-ins against an empty
  // contribution set: the dashboard is complete before any plugin exists.
  it('renders the built-ins in order, nothing added', () => {
    const region = mergeRegion(builtIns('a', 'b', 'c'), [], NONE);
    expect(ids(region)).toEqual(['a', 'b', 'c']);
    expect(region.entries.every(e => e.kind === 'builtin')).toBe(true);
    expect(region.diagnostics).toEqual([]);
  });

  // A gate-hidden built-in is not rendered, but its id still exists as an anchor
  // target (ui-surface § published ids).
  it('omits a gate-hidden built-in from the rendered entries', () => {
    const region = mergeRegion(
      [{ id: 'a' }, { id: 'b', hidden: true }, { id: 'c' }],
      [],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'c']);
  });
});

describe('mergeRegion — placement (AC-D4)', () => {
  // AC-D4 — contributions merge with the built-ins by anchor position
  // (after/before a published id, else the container end).
  it('AC-D4: places contributions before/after an anchor, else at the end', () => {
    const region = mergeRegion(
      builtIns('a', 'b', 'c'),
      [
        contribution('after-a', { anchor: { position: 'after', id: 'a' } }),
        contribution('before-c', { anchor: { position: 'before', id: 'c' } }),
        contribution('tail'),
      ],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'after-a', 'b', 'before-c', 'c', 'tail']);
  });

  // AC-D4 — the order is identical across reloads and independent of plugin load
  // order: the same contributions in any input order merge to the same result.
  it('AC-D4: is independent of the contributions input order', () => {
    const bi = builtIns('a', 'b');
    const contribs = [
      contribution('x', { anchor: { position: 'after', id: 'a' } }),
      contribution('y', { anchor: { position: 'after', id: 'a' }, order: 1 }),
      contribution('z'),
    ];
    const forward = ids(mergeRegion(bi, contribs, NONE));
    const reversed = ids(mergeRegion(bi, [...contribs].reverse(), NONE));
    expect(forward).toEqual(reversed);
  });

  // AC-D4 — ties at the same anchor break by contribution `order`, then `id`.
  it('AC-D4: breaks ties by order then id at a shared anchor', () => {
    const region = mergeRegion(
      builtIns('a'),
      [
        contribution('later', {
          anchor: { position: 'after', id: 'a' },
          order: 5,
        }),
        contribution('early', {
          anchor: { position: 'after', id: 'a' },
          order: 1,
        }),
        // No order → sorts after the ordered ones; then by id.
        contribution('zeta', { anchor: { position: 'after', id: 'a' } }),
        contribution('alpha', { anchor: { position: 'after', id: 'a' } }),
      ],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'early', 'later', 'alpha', 'zeta']);
  });

  // AC-D4 — a contribution whose anchor id does not exist renders at the
  // container's end, and the degradation is recorded (never silent).
  it('AC-D4: an unresolved anchor falls to the end with a diagnostic', () => {
    const region = mergeRegion(
      builtIns('a', 'b'),
      [contribution('orphan', { anchor: { position: 'after', id: 'ghost' } })],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'b', 'orphan']);
    expect(region.diagnostics).toHaveLength(1);
    expect(region.diagnostics[0]!.contributionId).toBe('orphan');
    expect(region.diagnostics[0]!.message).toContain('ghost');
  });

  // AC-D4 — anchoring to a gate-hidden built-in likewise falls to the end with a
  // diagnostic (its id exists but has no rendered position).
  it('AC-D4: anchoring to a hidden built-in falls to the end with a diagnostic', () => {
    const region = mergeRegion(
      [{ id: 'a' }, { id: 'b', hidden: true }],
      [contribution('c', { anchor: { position: 'after', id: 'b' } })],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'c']);
    expect(region.diagnostics).toHaveLength(1);
  });
});

describe('mergeRegion — suppression (AC-D5)', () => {
  // AC-D5 — a built-in suppressed by its published id does not render; other
  // built-ins and contributions are unaffected.
  it('AC-D5: a suppressed built-in is removed, siblings unaffected', () => {
    const region = mergeRegion(
      builtIns('a', 'b', 'c'),
      [contribution('p', { anchor: { position: 'after', id: 'a' } })],
      new Set(['b'])
    );
    expect(ids(region)).toEqual(['a', 'p', 'c']);
  });

  // AC-D5 — suppression removes only built-ins; a plugin cannot suppress another
  // plugin's contribution, so a contribution whose id happens to be in the
  // suppressed set still renders.
  it('AC-D5: suppression never removes a contribution', () => {
    const region = mergeRegion(
      builtIns('a'),
      [contribution('p')],
      new Set(['p'])
    );
    expect(ids(region)).toContain('p');
  });

  // AC-D5 — anchoring to a suppressed built-in falls to the end with a
  // diagnostic (a suppressed id has no rendered position, like a hidden one).
  it('AC-D5: anchoring to a suppressed built-in falls to the end', () => {
    const region = mergeRegion(
      builtIns('a', 'b'),
      [contribution('c', { anchor: { position: 'before', id: 'b' } })],
      new Set(['b'])
    );
    expect(ids(region)).toEqual(['a', 'c']);
    expect(region.diagnostics).toHaveLength(1);
  });
});
