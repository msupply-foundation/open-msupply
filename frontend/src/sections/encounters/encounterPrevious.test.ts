import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The side panel's Previous encounters read: the patient's earlier encounters
 * of the open encounter's type. The server's bound is inclusive, so the open
 * encounter and any other at the same instant come back and are dropped
 * here — as instants, since the stored visit date (any offset, as the old
 * client wrote it) and the server's UTC value need not match as strings.
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { EncounterPrevious } from './encounter.generated';
import { fetchPreviousEncounters, PREVIOUS_SHOWN } from './encounterPrevious';

afterEach(() => graphqlFetch.mockReset());

// The open encounter's visit date as its document stores it: a +02:00 offset.
const OPEN_START = '2025-06-16T11:51:22+02:00';

const variables = {
  storeId: 'store',
  patientId: 'patient-1',
  type: 'ReproductiveHealth',
  encounterId: 'open',
  before: OPEN_START,
};

const node = (id: string, startDatetime: string) => ({
  __typename: 'EncounterNode',
  id,
  startDatetime,
  status: 'VISITED',
});

const answer = (nodes: object[], totalCount = nodes.length) =>
  graphqlFetch.mockResolvedValue({
    kind: 'success',
    data: { encounters: { nodes, totalCount } },
  });

describe('fetchPreviousEncounters', () => {
  it('asks for the type on or before the stored visit date, one more than shown', async () => {
    answer([]);
    await fetchPreviousEncounters(variables);
    expect(graphqlFetch).toHaveBeenCalledWith(EncounterPrevious, {
      storeId: 'store',
      patientId: 'patient-1',
      type: 'ReproductiveHealth',
      before: OPEN_START,
      first: PREVIOUS_SHOWN + 1,
    });
  });

  it('drops the open encounter and any other at the same instant, as the server writes them', async () => {
    // The server answers in UTC: the open one and a twin at the same instant
    // read as earlier strings than the stored +02:00 value, but are not.
    const sameInstant = '2025-06-16T09:51:22+00:00';
    const earlier = node('earlier', '2025-06-10T09:00:00+00:00');
    answer([node('open', sameInstant), node('twin', sameInstant), earlier]);
    expect(await fetchPreviousEncounters(variables)).toEqual({
      rows: [earlier],
      more: false,
    });
  });

  it('lists five at most and says whether there are more beyond them', async () => {
    const rows = Array.from({ length: PREVIOUS_SHOWN }, (_, i) =>
      node(`e${i}`, `2025-05-${String(20 - i).padStart(2, '0')}T09:00:00+00:00`)
    );
    // Six come back with the open one; nine of the type are on or before.
    answer([node('open', '2025-06-16T09:51:22+00:00'), ...rows], 9);
    const result = await fetchPreviousEncounters(variables);
    expect(result.rows.map(r => r.id)).toEqual(rows.map(r => r.id));
    expect(result.more).toBe(true);
  });

  it('lists none after a refused or failed read', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'graphqlError', errors: [] });
    expect(await fetchPreviousEncounters(variables)).toEqual({
      rows: [],
      more: false,
    });
  });
});
