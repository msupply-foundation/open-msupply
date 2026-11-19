import { describe, expect, it, vi } from 'vitest';

/*
 * Which programs the picker offers (spec/program-enrolment rules § enrolling
 * a patient; case OMS-REG-PAT-04 `.53`). The read is the server's; the rule
 * over it is pure and runs for real.
 */

vi.mock('@/api/graphql', () => ({ graphqlFetch: vi.fn() }));

import { programsToOffer } from './programEnrolmentApi';

const HIV = { documentType: 'HIVCareProgram', contextId: 'hiv' };
const EPI = { documentType: 'EpiEnrolment', contextId: 'epi_ctx' };
const TB = { documentType: 'TBProgram', contextId: 'tb' };

describe('OMS-REG-PAT-04.53 — New program from the Vaccinations tab', () => {
  it('offers only immunisation programs, matched on their context', () => {
    expect(programsToOffer([HIV, EPI, TB], true, new Set(['epi_ctx']))).toEqual(
      [EPI]
    );
  });

  it('offers every program from anywhere else', () => {
    expect(
      programsToOffer([HIV, EPI, TB], false, new Set(['epi_ctx']))
    ).toEqual([HIV, EPI, TB]);
  });

  it('offers every program while the immunisation programs are unknown', () => {
    expect(programsToOffer([HIV, EPI], true, undefined)).toEqual([HIV, EPI]);
  });
});
