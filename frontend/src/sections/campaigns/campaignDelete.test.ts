import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type { DeleteCampaignsResult } from './campaigns.generated';
import { campaignsDeleted, survivingSelection } from './campaignDelete';

// Anchors: spec/campaigns/cases/OMS-REG-MNG-04.
//   .24 — confirming deletes the whole selection and clears it
//   .25 — a campaign tagged on a stock line deletes without being blocked
//   .29 — a refused selection deletes nothing; vanished rows leave the kept
//         selection
//   .30 — deleting an already-deleted campaign is rejected as not found
// The delete is ATOMIC — one mutation, one server transaction — so the client
// has no sequencing of its own: these pin the two outcomes and the pruning.
// The server-side facts (.25's absent in-use guard, .30's not-found, the
// rollback itself) are verified against the real backend — see BUILD_REPORT.

const deleted: GraphqlResult<DeleteCampaignsResult> = {
  kind: 'success',
  data: {
    centralServer: {
      campaign: {
        deleteCampaigns: { __typename: 'DeleteCampaignsNode', ids: ['a', 'b'] },
      },
    },
  },
};

describe('OMS-REG-MNG-04.24 — the whole selection deletes together', () => {
  it('reads a DeleteCampaignsNode as deleted', () => {
    // .25 rides along: nothing is pre-checked client-side — a campaign tagged
    // on stock or on documents is submitted just the same, so there is no
    // in-use branch for this mapping to have.
    expect(campaignsDeleted(deleted)).toBe(true);
  });
});

describe('OMS-REG-MNG-04.29/.30 — a refused delete deleted nothing', () => {
  it('reads the top-level not-found rejection as not deleted', () => {
    // The response union has no error member: an already-deleted or unknown id
    // anywhere in the selection arrives as a top-level Bad user input
    // (details CampaignDoesNotExist), and the atomic transaction rolled the
    // rest of the selection back with it.
    expect(
      campaignsDeleted({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'CampaignDoesNotExist' },
          },
        ],
      })
    ).toBe(false);
  });

  it('reads a transport failure as not deleted', () => {
    expect(campaignsDeleted({ kind: 'unexpectedError' })).toBe(false);
  });
});

describe('OMS-REG-MNG-04.29 — the kept selection drops vanished rows', () => {
  it('keeps ids still in the register, in selection order', () => {
    expect(
      survivingSelection(
        ['a', 'gone', 'c'],
        [{ id: 'c' }, { id: 'a' }, { id: 'x' }]
      )
    ).toEqual(['a', 'c']);
  });

  it('keeps the whole selection while the register still holds it', () => {
    expect(survivingSelection(['a', 'b'], [{ id: 'a' }, { id: 'b' }])).toEqual([
      'a',
      'b',
    ]);
  });

  it('empties when the register lost the whole selection', () => {
    expect(survivingSelection(['a'], [])).toEqual([]);
  });

  it('does nothing for an empty selection', () => {
    expect(survivingSelection([], [{ id: 'a' }])).toEqual([]);
  });
});
