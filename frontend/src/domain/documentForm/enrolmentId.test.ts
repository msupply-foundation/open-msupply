import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The enrolment ID field's server questions (spec/program-enrolment rules §
 * the enrolment ID; cases OMS-REG-PAT-04). The GraphQL edge is mocked; the
 * duplicate rule and the redraw loop run for real.
 */

const graphqlFetch = vi.fn();
vi.mock('../../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { drawFreeEnrolmentId, isEnrolmentIdFree } from './enrolmentId';
import { EnrolmentsHoldingId } from './enrolmentId.generated';

const holders = (...held: [name: string, id: string][]) => ({
  kind: 'success',
  data: {
    programEnrolments: {
      nodes: held.map(([name, programEnrolmentId]) => ({
        name,
        programEnrolmentId,
      })),
    },
  },
});

afterEach(() => graphqlFetch.mockReset());

describe('OMS-REG-PAT-04.36 / .38 / .55 — whether an enrolment ID is free', () => {
  it('asks across every program: the check carries no program type', async () => {
    graphqlFetch.mockResolvedValue(holders());
    await isEnrolmentIdFree('store', 'GRY-0001', undefined);
    expect(graphqlFetch).toHaveBeenCalledWith(EnrolmentsHoldingId, {
      storeId: 'store',
      id: 'GRY-0001',
    });
  });

  it('is free when no enrolment holds it', async () => {
    graphqlFetch.mockResolvedValue(holders());
    expect(await isEnrolmentIdFree('store', 'GRY-0001', undefined)).toBe(true);
  });

  it('is not free when another enrolment, of any program, holds it (.36)', async () => {
    graphqlFetch.mockResolvedValue(
      holders(['p/other/HIVCareProgram', 'GRY-0001'])
    );
    expect(await isEnrolmentIdFree('store', 'GRY-0001', 'p/me/TBProgram')).toBe(
      false
    );
  });

  it('ignores case: gry-0001 is a duplicate of GRY-0001 (.55)', async () => {
    graphqlFetch.mockResolvedValue(
      holders(['p/other/HIVCareProgram', 'GRY-0001'])
    );
    expect(await isEnrolmentIdFree('store', 'gry-0001', undefined)).toBe(false);
  });

  it('ignores surrounding spaces in what is held (.55)', async () => {
    graphqlFetch.mockResolvedValue(
      holders(['p/other/HIVCareProgram', ' gry-0001 '])
    );
    expect(await isEnrolmentIdFree('store', 'GRY-0001', undefined)).toBe(false);
  });

  it('a longer ID that merely contains it is no duplicate', async () => {
    graphqlFetch.mockResolvedValue(
      holders(['p/other/HIVCareProgram', 'GRY-00012'])
    );
    expect(await isEnrolmentIdFree('store', 'GRY-0001', undefined)).toBe(true);
  });

  it('is free when its only holder is this enrolment itself (.38)', async () => {
    graphqlFetch.mockResolvedValue(holders(['p/me/TBProgram', 'GRY-0001']));
    expect(await isEnrolmentIdFree('store', 'GRY-0001', 'p/me/TBProgram')).toBe(
      true
    );
  });

  it('any other holder counts, whichever sorts first', async () => {
    graphqlFetch.mockResolvedValue(
      holders(
        ['p/me/TBProgram', 'GRY-0001'],
        ['p/other/HIVCareProgram', 'GRY-0001']
      )
    );
    expect(await isEnrolmentIdFree('store', 'GRY-0001', 'p/me/TBProgram')).toBe(
      false
    );
  });

  it('a new enrolment (no name yet) holds nothing', async () => {
    graphqlFetch.mockResolvedValue(holders(['p/other/TBProgram', 'GRY-0001']));
    expect(await isEnrolmentIdFree('store', 'GRY-0001', undefined)).toBe(false);
  });

  it('cannot say when the check fails', async () => {
    graphqlFetch.mockResolvedValue({ kind: 'networkError' });
    expect(
      await isEnrolmentIdFree('store', 'GRY-0001', undefined)
    ).toBeUndefined();
  });
});

describe('OMS-REG-PAT-04.35 — drawing a free enrolment ID', () => {
  const sequence = (...ids: (string | undefined)[]) => {
    const queue = [...ids];
    return vi.fn(async () => queue.shift());
  };

  it('skips each ID another enrolment holds, keeping the next free one', async () => {
    const generate = sequence('GRY-0001', 'GRY-0002', 'GRY-0003');
    const held = new Set(['GRY-0001', 'GRY-0002']);
    const id = await drawFreeEnrolmentId(generate, async c => !held.has(c));
    expect(id).toBe('GRY-0003');
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('keeps the first draw when it is free', async () => {
    const generate = sequence('GRY-0001', 'GRY-0002');
    expect(await drawFreeEnrolmentId(generate, async () => true)).toBe(
      'GRY-0001'
    );
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('stops on a draw that repeats the one before, keeping it', async () => {
    const generate = sequence('FIXED', 'FIXED', 'OTHER');
    expect(await drawFreeEnrolmentId(generate, async () => false)).toBe(
      'FIXED'
    );
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('keeps a candidate whose check could not be made', async () => {
    const generate = sequence('GRY-0001');
    expect(await drawFreeEnrolmentId(generate, async () => undefined)).toBe(
      'GRY-0001'
    );
  });

  it('gives nothing when a draw fails', async () => {
    const generate = sequence(undefined);
    expect(await drawFreeEnrolmentId(generate, async () => true)).toBe(
      undefined
    );
  });

  it('stops after a bounded number of draws', async () => {
    let n = 0;
    const generate = vi.fn(async () => `GRY-${++n}`);
    const id = await drawFreeEnrolmentId(generate, async () => false);
    expect(generate).toHaveBeenCalledTimes(20);
    expect(id).toBe('GRY-20');
  });
});
