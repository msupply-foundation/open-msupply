import { describe, expect, it } from 'vitest';
import { formatEnrolmentId } from './enrolmentId';

describe('formatEnrolmentId', () => {
  it('joins the store code and the counter, padded to four digits', () => {
    expect(formatEnrolmentId('GRY', 7)).toBe('GRY-0007');
    expect(formatEnrolmentId('GRY', 1234)).toBe('GRY-1234');
  });

  it('keeps a counter past four digits whole', () => {
    expect(formatEnrolmentId('GRY', 12345)).toBe('GRY-12345');
  });
});
