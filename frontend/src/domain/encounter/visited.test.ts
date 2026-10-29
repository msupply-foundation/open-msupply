import { describe, expect, it } from 'vitest';
import { visitedFields } from './visited';

const now = new Date('2026-10-14T10:00:00Z');
const later = '2026-10-14T11:00:00Z';

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
