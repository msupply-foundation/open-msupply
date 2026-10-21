import { describe, expect, it } from 'vitest';
import { suggestsVisited, visitedFields } from './visited';

const now = new Date('2026-10-14T10:00:00Z');
const past = '2026-10-14T09:00:00Z';
const later = '2026-10-14T11:00:00Z';

describe('suggestsVisited', () => {
  it('asks on an encounter Pending as saved and as edited, its visit passed', () => {
    expect(
      suggestsVisited(
        { status: 'PENDING', startDatetime: past },
        'PENDING',
        now
      )
    ).toBe(true);
  });

  it('does not ask before the visit', () => {
    expect(
      suggestsVisited(
        { status: 'PENDING', startDatetime: later },
        'PENDING',
        now
      )
    ).toBe(false);
  });

  it('does not ask once a status is chosen, or of one saved as another', () => {
    const saved = { status: 'PENDING' as const, startDatetime: past };
    expect(suggestsVisited(saved, 'CANCELLED', now)).toBe(false);
    expect(
      suggestsVisited({ ...saved, status: 'VISITED' }, 'PENDING', now)
    ).toBe(false);
  });

  it('does not ask with no saved encounter or visit date', () => {
    expect(suggestsVisited(undefined, 'PENDING', now)).toBe(false);
    expect(suggestsVisited({ status: 'PENDING' }, 'PENDING', now)).toBe(false);
  });
});

describe('visitedFields', () => {
  it('records the end time as now where none is recorded', () => {
    expect(visitedFields(undefined, now)).toEqual({
      status: 'VISITED',
      endDatetime: now.toISOString(),
    });
  });

  it('keeps an end time already recorded', () => {
    expect(visitedFields(later, now)).toEqual({
      status: 'VISITED',
      endDatetime: later,
    });
  });
});
