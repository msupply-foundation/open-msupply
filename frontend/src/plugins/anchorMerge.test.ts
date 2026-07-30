import { describe, expect, it } from 'vitest';
import {
  anchorMerge,
  type AnchorContribution,
  type AnchorHost,
} from './anchorMerge';

// The shared anchored merge (spec/plugins/rules.md § contributions;
// sdk-contract § the column slot). Behaviours cited from AC-PLUG-K1 (anchored
// placement, reload-stable order) and AC-PLUG-K2 (missing anchor degrades
// visibly). The two host surfaces that delegate here keep their own suites —
// spec/dashboard OMS-REG-DB-02 (regions.test.ts) and
// OMS-REG-REPL-16 (lineColumns.test.ts) — so this one covers the ordering
// contract itself, in isolation.

const hosts = (...ids: string[]): AnchorHost[] => ids.map(id => ({ id }));
const contribution = (
  id: string,
  extra: Omit<AnchorContribution, 'id'> = {}
): AnchorContribution => ({ id, ...extra });
const ids = (result: ReturnType<typeof anchorMerge>) =>
  result.entries.map(entry => entry.item.id);

describe('anchorMerge — no contributions', () => {
  it('is the identity on the rendered hosts', () => {
    const merged = anchorMerge(hosts('a', 'b', 'c'), []);
    expect(ids(merged)).toEqual(['a', 'b', 'c']);
    expect(merged.entries.every(entry => entry.kind === 'host')).toBe(true);
    expect(merged.diagnostics).toEqual([]);
  });

  it('drops a hidden host from the entries', () => {
    const merged = anchorMerge(
      [{ id: 'a' }, { id: 'b', hidden: true }, { id: 'c' }],
      []
    );
    expect(ids(merged)).toEqual(['a', 'c']);
  });

  it('carries the caller`s own host objects through untouched', () => {
    const host = { id: 'a', column: { header: 'Code' } };
    const merged = anchorMerge([host], []);
    expect(merged.entries[0]).toEqual({ kind: 'host', item: host });
    expect(merged.entries[0]!.item).toBe(host);
  });
});

describe('anchorMerge — placement (AC-PLUG-K1)', () => {
  it('places a contribution before / after its anchor, else at the end', () => {
    const merged = anchorMerge(hosts('a', 'b', 'c'), [
      contribution('after-a', { anchor: { after: 'a' } }),
      contribution('before-c', { anchor: { before: 'c' } }),
      contribution('tail'),
      contribution('explicit-end', { anchor: { end: true } }),
    ]);
    expect(ids(merged)).toEqual([
      'a',
      'after-a',
      'b',
      'before-c',
      'c',
      'explicit-end',
      'tail',
    ]);
    expect(merged.diagnostics).toEqual([]);
  });

  it('breaks ties at a shared anchor by order, then id', () => {
    const merged = anchorMerge(hosts('a'), [
      contribution('later', { anchor: { after: 'a' }, order: 5 }),
      contribution('early', { anchor: { after: 'a' }, order: 1 }),
      // No order → after every ordered sibling; then alphabetically.
      contribution('zeta', { anchor: { after: 'a' } }),
      contribution('alpha', { anchor: { after: 'a' } }),
    ]);
    expect(ids(merged)).toEqual(['a', 'early', 'later', 'alpha', 'zeta']);
  });

  it('is shuffle-invariant: every input permutation merges identically', () => {
    const hostItems = hosts('a', 'b', 'c');
    const contribs = [
      contribution('p1', { anchor: { after: 'a' } }),
      contribution('p2', { anchor: { after: 'a' }, order: 1 }),
      contribution('p3', { anchor: { before: 'c' } }),
      contribution('p4'),
      contribution('p5', { anchor: { after: 'ghost' } }),
    ];
    const expected = ids(anchorMerge(hostItems, contribs));
    // All 120 permutations of five contributions — placement can never depend
    // on which bundle finished loading first (AC-PLUG-K1).
    const permute = <T>(items: T[]): T[][] =>
      items.length <= 1
        ? [items]
        : items.flatMap((item, index) =>
            permute([...items.slice(0, index), ...items.slice(index + 1)]).map(
              rest => [item, ...rest]
            )
          );
    const permutations = permute(contribs);
    expect(permutations).toHaveLength(120);
    for (const order of permutations) {
      expect(ids(anchorMerge(hostItems, order))).toEqual(expected);
    }
  });

  it('keeps a host ahead of a contribution that lands on its coordinate', () => {
    // `before b` resolves to 0.5 and `after a` to 0.5 as well — both sit
    // between the two hosts, and neither displaces a host.
    const merged = anchorMerge(hosts('a', 'b'), [
      contribution('x', { anchor: { before: 'b' } }),
      contribution('y', { anchor: { after: 'a' } }),
    ]);
    expect(ids(merged)).toEqual(['a', 'x', 'y', 'b']);
  });
});

describe('anchorMerge — degradation (AC-PLUG-K2)', () => {
  it('falls to the end with a diagnostic when the anchor does not exist', () => {
    const merged = anchorMerge(hosts('a', 'b'), [
      contribution('orphan', { anchor: { after: 'ghost' } }),
    ]);
    expect(ids(merged)).toEqual(['a', 'b', 'orphan']);
    expect(merged.diagnostics).toHaveLength(1);
    expect(merged.diagnostics[0]!.contributionId).toBe('orphan');
    expect(merged.diagnostics[0]!.message).toContain('ghost');
  });

  it('treats a hidden host as absent — its id has no position', () => {
    const merged = anchorMerge(
      [{ id: 'a' }, { id: 'b', hidden: true }, { id: 'c' }],
      [contribution('p', { anchor: { after: 'b' } })]
    );
    expect(ids(merged)).toEqual(['a', 'c', 'p']);
    expect(merged.diagnostics).toHaveLength(1);
  });

  it('reports one diagnostic per broken contribution, not per host', () => {
    const merged = anchorMerge(hosts('a', 'b', 'c'), [
      contribution('one', { anchor: { after: 'ghost' } }),
      contribution('two', { anchor: { before: 'phantom' } }),
      contribution('fine', { anchor: { after: 'b' } }),
    ]);
    expect(merged.diagnostics.map(d => d.contributionId)).toEqual([
      'one',
      'two',
    ]);
  });
});
