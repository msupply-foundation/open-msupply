import { describe, expect, it } from 'vitest';
import { suggestNextVisit } from './nextVisit';

/*
 * What the prompt after Save as visited is prefilled with (internal #1656;
 * spec/vaccination-card rules § effects on the encounter): the card's
 * earliest suggested date still to come, else the type's own suggestion
 * where still to come.
 */

// An instant, so the tests read the same in every zone; `today` is the local
// day the card is compared against, given by the caller.
const now = new Date('2026-10-22T09:30:00Z');
const today = '2026-10-22';
const later = { startDatetime: '2026-11-05T09:00:00Z', label: 'Follow-up' };

/** A local calendar day at `now`'s local time of day. */
const atTimeOfDay = (day: string): number => {
  const at = new Date(`${day}T00:00:00`);
  at.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return at.getTime();
};

describe('suggestNextVisit', () => {
  it('takes the earliest suggested date still to come on the card, at the time of day it is now, with the doses due that day as the reason', () => {
    const doses = [
      { label: 'BCG', suggestedDate: '2026-10-01' },
      { label: 'DPT 2', suggestedDate: '2026-11-12' },
      { label: 'DPT 1', suggestedDate: '2026-10-29' },
      { label: 'OPV 1', suggestedDate: '2026-10-29' },
      { label: 'MR 1', suggestedDate: null },
    ];
    const out = suggestNextVisit(later, doses, now, today);
    expect(out.reason).toBe('DPT 1, OPV 1');
    expect(new Date(out.startDatetime!).getTime()).toBe(
      atTimeOfDay('2026-10-29')
    );
  });

  it('leaves a dose suggested today or earlier out: it is not to come', () => {
    const doses = [
      { label: 'BCG', suggestedDate: '2026-10-22' },
      { label: 'DPT 1', suggestedDate: '2026-09-29' },
    ];
    expect(suggestNextVisit(undefined, doses, now, today)).toEqual({});
  });

  it("falls back to the type's own suggestion when the card has none to come", () => {
    const doses = [{ label: 'BCG', suggestedDate: '2026-10-01' }];
    expect(suggestNextVisit(later, doses, now, today)).toEqual({
      startDatetime: later.startDatetime,
      reason: 'Follow-up',
    });
  });

  it("offers the type's own suggestion, its label the reason, outside an immunisation enrolment", () => {
    expect(suggestNextVisit(later, undefined, now, today)).toEqual({
      startDatetime: later.startDatetime,
      reason: 'Follow-up',
    });
    expect(
      suggestNextVisit({ ...later, label: null }, undefined, now, today)
    ).toEqual({ startDatetime: later.startDatetime, reason: undefined });
  });

  it("suggests nothing for a type's date already passed, or no suggestion at all", () => {
    expect(
      suggestNextVisit(
        { startDatetime: '2026-10-22T08:00:00Z', label: 'Follow-up' },
        undefined,
        now,
        today
      )
    ).toEqual({});
    expect(suggestNextVisit(null, undefined, now, today)).toEqual({});
  });
});
