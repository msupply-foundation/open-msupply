import { describe, expect, it } from 'vitest';
import { deleteEach, type WriteOutcome } from './writeOutcome';

// The batch size of a bulk delete. The asset catalogue sends ten at a time;
// Manage › Plugins sends one, because the server addresses a plugin row by id
// alone and a backend and a frontend row can share one
// (spec/plugin-management/rules.md › uninstalling plugins).

const tracked = () => {
  let inFlight = 0;
  let most = 0;
  const deleteOne = async (): Promise<WriteOutcome> => {
    inFlight += 1;
    most = Math.max(most, inFlight);
    await new Promise(resolve => setTimeout(resolve, 1));
    inFlight -= 1;
    return { kind: 'done' };
  };
  return { deleteOne, most: () => most };
};

describe('deleteEach — how many deletes are in flight at once', () => {
  it('a batch of one never runs two calls together', async () => {
    const calls = tracked();
    await deleteEach(['shared', 'shared', 'other'], calls.deleteOne, 1);
    expect(calls.most()).toBe(1);
  });

  it('by default runs a batch together', async () => {
    const calls = tracked();
    await deleteEach(['a', 'b', 'c'], calls.deleteOne);
    expect(calls.most()).toBe(3);
  });

  it('reports a refusal beside the records it did delete, in order', async () => {
    const summary = await deleteEach(
      ['a', 'gone', 'b'],
      async record =>
        record === 'gone'
          ? { kind: 'refused', reason: 'Plugin not found' }
          : { kind: 'done' },
      1
    );
    expect(summary.deleted).toEqual(['a', 'b']);
    expect(summary.refused).toEqual([
      { record: 'gone', reason: 'Plugin not found' },
    ]);
  });
});
