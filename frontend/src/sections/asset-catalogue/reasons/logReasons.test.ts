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
  const draft = {
    reason: 'Stored',
    status: 'NOT_IN_USE' as const,
    commentsRequired: false,
  };
  it("the editor's one check is a missing text, so a text already listed under that status passes it", () => {
    expect(isReasonMissing(draft)).toBe(false);
  });
  it('each create is its own insert under its own id — nothing merges two of one text', () => {
    expect(toReasonInput(draft, 'a')).toEqual({
      id: 'a',
      assetLogStatus: 'NOT_IN_USE',
      reason: 'Stored',
      commentsRequired: false,
    });
    expect(toReasonInput(draft, 'b').id).toBe('b');
  });
});
