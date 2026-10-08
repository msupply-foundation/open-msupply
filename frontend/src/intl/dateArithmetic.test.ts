import { describe, expect, it } from 'vitest';
import { dayBefore } from './dateArithmetic';

// Pure calendar-date arithmetic on ISO strings (no time, no zone) — assertions
// are literal, and hold in any device timezone because the shared conversion
// parses and formats the LOCAL calendar day symmetrically.
describe('dayBefore', () => {
  it('is the previous calendar day', () => {
    expect(dayBefore('2026-07-15')).toBe('2026-07-14');
  });

  it('rolls back across month and year boundaries', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2024-03-01')).toBe('2024-02-29'); // leap year
    expect(dayBefore('2026-01-01')).toBe('2025-12-31');
  });

  it('passes an unparseable date through unchanged', () => {
    expect(dayBefore('not-a-date')).toBe('not-a-date');
  });
});
