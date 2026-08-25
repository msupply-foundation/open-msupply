import { describe, expect, it } from 'vitest';
import type { Component } from 'solid-js';
import {
  applicableSuppressions,
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
// Behaviours cited from spec/dashboard/cases/OMS-REG-DB-02 (plugin-region
// semantics) and OMS-REG-DB-01.58 (the built-in default set).

// A placeholder component — the merge carries it through untouched; its
// identity is never inspected here.
const noop = (() => null) as Component;
const contribution = (
  id: string,
  extra: Partial<RegionContribution> = {}
): RegionContribution => ({ id, Component: noop, ...extra });
const builtIns = (...ids: string[]): RegionBuiltIn[] => ids.map(id => ({ id }));
const ids = (region: ReturnType<typeof mergeRegion>) =>
  region.entries.map(e => e.id);
const NONE: ReadonlySet<string> = new Set();

describe('published ids (OMS-REG-DB-01.58, OMS-REG-DB-02.1, ui-surface § S3)', () => {
  // OMS-REG-DB-01.58 / OMS-REG-DB-02.1 — the built-in set is exactly the three
  // widgets with their documented panels and stats; the ids are the stable
  // public API a contribution anchors to or suppresses.
  it('OMS-REG-DB-01.58: exposes exactly the three built-in widgets', () => {
    expect(DASHBOARD_IDS.replenishment.id).toBe('replenishment');
    expect(DASHBOARD_IDS.distribution.id).toBe('distribution');
    expect(DASHBOARD_IDS.inventory.id).toBe('inventory');
  });

  it('OMS-REG-DB-02.1: every published id is unique and dot-scoped under its widget', () => {
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

  // A gate-hidden built-in is not rendered, but its id still exists as an
  // anchor target (ui-surface § published ids).
  it('omits a gate-hidden built-in from the rendered entries', () => {
    const region = mergeRegion(
      [{ id: 'a' }, { id: 'b', hidden: true }, { id: 'c' }],
      [],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'c']);
  });
});

describe('mergeRegion — placement (OMS-REG-DB-02.2–.5)', () => {
  // OMS-REG-DB-02.2 — contributions merge with the built-ins by anchor position
  // (after/before a published id, else the container end).
  it('OMS-REG-DB-02.2: places contributions before/after an anchor, else at the end', () => {
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

  // OMS-REG-DB-02.4 — the order is identical across reloads and independent of
  // plugin load order: the same contributions in any input order merge to the
  // same result.
  it('OMS-REG-DB-02.4: is independent of the contributions input order', () => {
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

  // OMS-REG-DB-02.3 — ties at the same anchor break by contribution `order`,
  // then `id`.
  it('OMS-REG-DB-02.3: breaks ties by order then id at a shared anchor', () => {
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

  // OMS-REG-DB-02.5 — a contribution whose anchor id does not exist renders at
  // the container's end, and the degradation is recorded (never silent).
  it('OMS-REG-DB-02.5: an unresolved anchor falls to the end with a diagnostic', () => {
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

  // OMS-REG-DB-02.5 — anchoring to a gate-hidden built-in likewise falls to
  // the end with a diagnostic (its id exists but has no rendered position).
  it('OMS-REG-DB-02.5: anchoring to a hidden built-in falls to the end with a diagnostic', () => {
    const region = mergeRegion(
      [{ id: 'a' }, { id: 'b', hidden: true }],
      [contribution('c', { anchor: { position: 'after', id: 'b' } })],
      NONE
    );
    expect(ids(region)).toEqual(['a', 'c']);
    expect(region.diagnostics).toHaveLength(1);
  });
});

describe('mergeRegion — suppression (OMS-REG-DB-02.6–.8)', () => {
  // OMS-REG-DB-02.6 — a built-in suppressed by its published id does not
  // render; other built-ins and contributions are unaffected.
  it('OMS-REG-DB-02.6: a suppressed built-in is removed, siblings unaffected', () => {
    const region = mergeRegion(
      builtIns('a', 'b', 'c'),
      [contribution('p', { anchor: { position: 'after', id: 'a' } })],
      new Set(['b'])
    );
    expect(ids(region)).toEqual(['a', 'p', 'c']);
  });

  // OMS-REG-DB-02.8 — suppression removes only built-ins; a plugin cannot
  // suppress another plugin's contribution, so a contribution whose id happens
  // to be in the suppressed set still renders.
  it('OMS-REG-DB-02.8: suppression never removes a contribution', () => {
    const region = mergeRegion(
      builtIns('a'),
      [contribution('p')],
      new Set(['p'])
    );
    expect(ids(region)).toContain('p');
  });

  // OMS-REG-DB-02.5 — anchoring to a suppressed built-in falls to the end with
  // a diagnostic (a suppressed id has no rendered position, like a hidden one).
  it('OMS-REG-DB-02.5: anchoring to a suppressed built-in falls to the end', () => {
    const region = mergeRegion(
      builtIns('a', 'b'),
      [contribution('c', { anchor: { position: 'before', id: 'b' } })],
      new Set(['b'])
    );
    expect(ids(region)).toEqual(['a', 'c']);
    expect(region.diagnostics).toHaveLength(1);
  });
});

describe('applicableSuppressions — the never-blank body (OMS-REG-DB-02.18)', () => {
  // Suppression is site-wide (registry § suppressedPieces), so obeying a set
  // that empties the widget region would blank the dashboard of every store on
  // the server — including the ones a plugin's own contributions exclude. The
  // set is refused instead, and named. A screen only some stores should see is
  // the body region's, which needs no suppression at all.
  const widgets = builtIns('replenishment', 'distribution', 'inventory');

  it('applies an ordinary suppression untouched', () => {
    const suppressed = new Set(['replenishment']);
    const result = applicableSuppressions(widgets, 0, suppressed);
    expect(result.applied).toBe(suppressed); // the same set, not a copy
    expect(result.ignored).toEqual([]);
  });

  it('OMS-REG-DB-02.18: ignores a set that would leave nothing to render', () => {
    const result = applicableSuppressions(
      widgets,
      0,
      new Set(['replenishment', 'distribution', 'inventory'])
    );
    expect([...result.applied]).toEqual([]);
    expect([...result.ignored].sort()).toEqual([
      'distribution',
      'inventory',
      'replenishment',
    ]);
  });

  it('obeys the same set once a contributed widget fills the body', () => {
    // Something renders, so the body is not blank and nothing is refused: a
    // plugin MAY clear the built-ins to put its own widget in their place.
    const suppressed = new Set(['replenishment', 'distribution', 'inventory']);
    const result = applicableSuppressions(widgets, 1, suppressed);
    expect(result.applied).toBe(suppressed);
    expect(result.ignored).toEqual([]);
  });

  it('recovers only the widgets, leaving nested suppressions obeyed', () => {
    const result = applicableSuppressions(
      widgets,
      0,
      new Set([
        'replenishment',
        'distribution',
        'inventory',
        'inventory.stock-levels',
      ])
    );
    // The widgets come back; the panel inside one of them stays suppressed —
    // it could not have emptied the body, so nothing about it is in doubt.
    expect([...result.applied]).toEqual(['inventory.stock-levels']);
    expect(result.ignored).not.toContain('inventory.stock-levels');
  });

  it('does not pretend to recover a built-in its own gate hides', () => {
    // Ignoring a suppression only helps where the built-in would then render.
    // A region of gate-hidden built-ins is empty for a reason suppression
    // cannot fix, so nothing is refused and nothing is reported.
    const gated: RegionBuiltIn[] = [
      { id: 'replenishment', hidden: true },
      { id: 'distribution', hidden: true },
    ];
    const result = applicableSuppressions(
      gated,
      0,
      new Set(['replenishment', 'distribution'])
    );
    expect(result.ignored).toEqual([]);
    expect([...result.applied].sort()).toEqual([
      'distribution',
      'replenishment',
    ]);
  });
});
