import { describe, expect, it } from 'vitest';
import { getDateTimeCell } from './tableHelpers';
import { localisedDateTime } from '../../../intl/formatDateTime';

// The cell takes the instant the column's accessor returns.
const render = (value: unknown): unknown => {
  const { cell } = getDateTimeCell();
  if (typeof cell !== 'function') throw new Error('no cell template');
  return cell({ getValue: () => value } as never);
};

describe('getDateTimeCell', () => {
  it('shows the date and the time of day together', () => {
    const iso = '2026-11-19T04:42:00Z';
    const shown = render(iso);
    expect(shown).toBe(localisedDateTime(iso));
    // Both parts: a time of day, not the date alone.
    expect(shown).toMatch(/\d{1,2}:\d{2}/);
  });

  it('is blank when there is no value', () => {
    expect(render(null)).toBe('');
    expect(render(undefined)).toBe('');
  });
});
