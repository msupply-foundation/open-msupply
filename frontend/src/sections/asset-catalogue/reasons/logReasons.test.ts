import { describe, expect, it } from 'vitest';
import {
  STATUSES,
  emptyDraft,
  isReasonMissing,
  statusOptions,
  toReasonInput,
} from './logReasons';

// Anchors: spec/asset-catalogue/cases/OMS-REG-CAT-03 — the log reasons.

describe('OMS-REG-CAT-03.17 — a new reason starts at Functioning, comments not required', () => {
  it('the empty draft', () => {
    expect(emptyDraft()).toEqual({
      reason: '',
      status: 'FUNCTIONING',
      commentsRequired: false,
    });
  });
});

describe('OMS-REG-CAT-03.18 — a blank or spaces-only reason is missing', () => {
  it.each(['', '   '])('"%s" is missing', reason => {
    expect(isReasonMissing({ ...emptyDraft(), reason })).toBe(true);
  });
  it('any text is not', () => {
    expect(isReasonMissing({ ...emptyDraft(), reason: ' x ' })).toBe(false);
  });
});

describe('OMS-REG-CAT-03.2–.9 / .19 — a reason for each of the six statuses', () => {
  it("offers the six statuses in the server's order", () => {
    expect(statusOptions().map(o => o.value)).toEqual([
      'DECOMMISSIONED',
      'FUNCTIONING',
      'FUNCTIONING_BUT_NEEDS_ATTENTION',
      'NOT_FUNCTIONING',
      'NOT_IN_USE',
      'UNSERVICEABLE',
    ]);
  });
  it.each(STATUSES)(
    'creates a %s reason with the text as typed and the flag',
    status => {
      expect(
        toReasonInput(
          { reason: ' Worn out ', status, commentsRequired: true },
          'id-1'
        )
      ).toEqual({
        id: 'id-1',
        assetLogStatus: status,
        reason: ' Worn out ',
        commentsRequired: true,
      });
    }
  );
});

describe('OMS-REG-CAT-03.20 — nothing checks a duplicate reason text', () => {
  it('two drafts with the same text and status both become inserts', () => {
    const draft = {
      reason: 'Stored',
      status: 'NOT_IN_USE' as const,
      commentsRequired: false,
    };
    expect(toReasonInput(draft, 'a').reason).toBe(
      toReasonInput(draft, 'b').reason
    );
  });
});
