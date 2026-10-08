import { describe, expect, it } from 'vitest';
import { keepIdentities, moveTo, reorderBy } from './reorderLogic';

const ids = ['a', 'b', 'c', 'd'];

describe('reorderBy', () => {
  it('moves an id to an earlier index', () => {
    expect(reorderBy(ids, 'd', 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves an id to a later index, measured after its removal', () => {
    expect(reorderBy(ids, 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('clamps an index past the ends', () => {
    expect(reorderBy(ids, 'b', -3)).toEqual(['b', 'a', 'c', 'd']);
    expect(reorderBy(ids, 'b', 9)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('leaves the order alone for an id it does not hold', () => {
    expect(reorderBy(ids, 'z', 0)).toEqual(ids);
  });
});

describe('moveTo', () => {
  it('steps one place in either direction', () => {
    expect(moveTo(ids, 'c', 'up')).toEqual(['a', 'c', 'b', 'd']);
    expect(moveTo(ids, 'b', 'down')).toEqual(['a', 'c', 'b', 'd']);
  });

  it('jumps to either end', () => {
    expect(moveTo(ids, 'c', 'top')).toEqual(['c', 'a', 'b', 'd']);
    expect(moveTo(ids, 'b', 'bottom')).toEqual(['a', 'c', 'd', 'b']);
  });

  it('is a no-op at the end it is already at', () => {
    expect(moveTo(ids, 'a', 'up')).toEqual(ids);
    expect(moveTo(ids, 'd', 'down')).toEqual(ids);
  });
});

describe('keepIdentities', () => {
  const rows = [
    { id: 'a', label: 'A', description: 'first' },
    { id: 'b', label: 'B' },
  ];
  const first = keepIdentities(new Map(), rows);

  it('reuses the object of the same id across a rebuild', () => {
    // What a parent mapping its own state hands over on every reorder: equal
    // rows, all-new objects, in a new order.
    const rebuilt = keepIdentities(first.held, [
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A', description: 'first' },
    ]);
    expect(rebuilt.items[0]).toBe(first.items[1]);
    expect(rebuilt.items[1]).toBe(first.items[0]);
  });

  it('takes the new object when either line changed', () => {
    const next = [
      { id: 'a', label: 'A renamed', description: 'first' },
      { id: 'b', label: 'B', description: 'now has one' },
    ];
    const rebuilt = keepIdentities(first.held, next);
    expect(rebuilt.items[0]).toBe(next[0]);
    expect(rebuilt.items[1]).toBe(next[1]);
  });

  it('keeps the order and content it was given', () => {
    const next = [{ id: 'b', label: 'B' }, ...rows];
    expect(keepIdentities(first.held, next)).toMatchObject({ items: next });
  });

  it('drops an id that has left, so the cache cannot grow unbounded', () => {
    const rebuilt = keepIdentities(first.held, [{ id: 'b', label: 'B' }]);
    expect([...rebuilt.held.keys()]).toEqual(['b']);
  });

  it('does not resurrect an identity from a row that had left', () => {
    const gone = keepIdentities(first.held, [{ id: 'b', label: 'B' }]);
    const returned = { id: 'a', label: 'A', description: 'first' };
    const back = keepIdentities(gone.held, [returned, { id: 'b', label: 'B' }]);
    expect(back.items[0]).toBe(returned);
  });
});
