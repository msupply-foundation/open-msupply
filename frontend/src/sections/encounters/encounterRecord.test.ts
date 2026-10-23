import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The encounter record screen's read. The screen shows its spinner only until
 * the read answers, so a refused or failed read must answer too: with no
 * record, which shows the not-found notice (OMS-REG-ENC-01.5).
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { fetchEncounterRecord } from './encounterRecord';

afterEach(() => graphqlFetch.mockReset());

const key = { storeId: 'store', id: 'encounter-1' };

describe('fetchEncounterRecord', () => {
  it('answers with the encounter it reads', async () => {
    const node = { id: 'encounter-1' };
    graphqlFetch.mockResolvedValue({
      kind: 'success',
      data: { encounters: { nodes: [node] } },
    });
    expect(await fetchEncounterRecord(key)).toEqual({ record: node });
  });

  it('answers with no record for an id that names none', async () => {
    graphqlFetch.mockResolvedValue({
      kind: 'success',
      data: { encounters: { nodes: [] } },
    });
    expect(await fetchEncounterRecord(key)).toEqual({ record: undefined });
  });

  it('answers with no record when the server refuses the read (OMS-REG-ENC-01.5)', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'forbidden' });
    expect(await fetchEncounterRecord(key)).toEqual({ record: undefined });
  });

  it('answers with no record when the read fails (OMS-REG-ENC-01.5)', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'unexpectedError' });
    expect(await fetchEncounterRecord(key)).toEqual({ record: undefined });
  });
});
