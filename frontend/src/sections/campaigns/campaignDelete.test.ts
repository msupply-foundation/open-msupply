import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type { DeleteCampaignResult } from './campaigns.generated';
import { campaignDeleted, runCampaignDeletes } from './campaignDelete';

// Anchors: spec/campaigns/cases/OMS-REG-MNG-04.
//   .24 — confirming removes the campaigns from the register
//   .25 — a campaign tagged on a stock line deletes without being blocked
//   .29 — a selection in which one campaign cannot be deleted reports the
//         generic notice, and the deletes that succeeded stay deleted
//   .30 — deleting an already-deleted campaign is rejected as not found
// Deletion has no bulk operation, so the client's own sequencing IS the
// behaviour: these pin what happens across n independent deletes. The
// server-side facts (.25's absent in-use guard, .30's RecordNotFound) are
// verified against the real backend — see BUILD_REPORT.

const success: GraphqlResult<DeleteCampaignResult> = {
  kind: 'success',
  data: {
    centralServer: {
      campaign: {
        deleteCampaign: { __typename: 'DeleteCampaignSuccess', id: 'camp-1' },
      },
    },
  },
};

const notFound: GraphqlResult<DeleteCampaignResult> = {
  kind: 'success',
  data: {
    centralServer: {
      campaign: {
        deleteCampaign: {
          __typename: 'DeleteCampaignError',
          error: {
            __typename: 'RecordNotFound',
            description: 'Record not found',
          },
        },
      },
    },
  },
};

describe('OMS-REG-MNG-04.30 — a delete of something already gone is refused', () => {
  it('reads DeleteCampaignSuccess as deleted', () => {
    expect(campaignDeleted(success)).toBe(true);
  });

  it('reads RecordNotFound as not deleted', () => {
    // The existence check runs against the non-deleted set, so a second delete
    // of the same campaign and an id that never existed are indistinguishable —
    // both are RecordNotFound, and both count as a failure here.
    expect(campaignDeleted(notFound)).toBe(false);
  });

  it('reads a transport failure as not deleted', () => {
    expect(campaignDeleted({ kind: 'unexpectedError' })).toBe(false);
  });
});

describe('OMS-REG-MNG-04.24 — confirming deletes the whole selection', () => {
  it('submits every selected id, in order, and reports them all deleted', async () => {
    const submitted: string[] = [];
    const report = await runCampaignDeletes(['a', 'b', 'c'], async id => {
      submitted.push(id);
      return true;
    });
    expect(submitted).toEqual(['a', 'b', 'c']);
    expect(report).toEqual({ deleted: ['a', 'b', 'c'], failed: [] });
  });

  it('submits every id even though one is in use — there is no in-use guard (.25)', async () => {
    // Nothing is pre-checked client-side: a campaign tagged on stock or on
    // documents deletes just the same, so the client has no guard to mirror.
    const report = await runCampaignDeletes(['tagged'], async () => true);
    expect(report).toEqual({ deleted: ['tagged'], failed: [] });
  });

  it('does nothing for an empty selection', async () => {
    expect(await runCampaignDeletes([], async () => true)).toEqual({
      deleted: [],
      failed: [],
    });
  });
});

describe('OMS-REG-MNG-04.29 — a partial delete keeps what it managed', () => {
  it('reports both sides and keeps going after a rejection', async () => {
    // No surrounding transaction exists, so a rejection mid-selection neither
    // rolls back what went before nor stops what follows.
    const report = await runCampaignDeletes(
      ['a', 'gone', 'c'],
      async id => id !== 'gone'
    );
    expect(report).toEqual({ deleted: ['a', 'c'], failed: ['gone'] });
  });

  it('reports every id as failed when none could be deleted', async () => {
    expect(await runCampaignDeletes(['x', 'y'], async () => false)).toEqual({
      deleted: [],
      failed: ['x', 'y'],
    });
  });
});
