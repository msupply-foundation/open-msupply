import { describe, expect, it } from 'vitest';
import { formatPatientCode, randomPart } from './patientCode';

describe('formatPatientCode', () => {
  it('joins the store code, the random part and the counter, padded to four digits', () => {
    expect(formatPatientCode('GRY', 'K7Q', 1)).toBe('GRY-K7Q-0001');
    expect(formatPatientCode('GRY', 'K7Q', 12345)).toBe('GRY-K7Q-12345');
  });
});

describe('randomPart', () => {
  it('is three characters without the lookalikes', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomPart()).toMatch(/^[A-HJKMNP-Z2-9]{3}$/);
    }
  });

  it('maps each byte onto the alphabet', () => {
    const bytes = [0, 1, 30];
    expect(randomPart(count => Uint8Array.from(bytes.splice(0, count)))).toBe(
      'AB9'
    );
  });

  it('draws again for a byte that would favour the first characters', () => {
    // 248 and above are beyond the last whole run of the 31-character
    // alphabet, so they are skipped rather than wrapped.
    const bytes = [255, 248, 0, 1, 2];
    expect(randomPart(count => Uint8Array.from(bytes.splice(0, count)))).toBe(
      'ABC'
    );
  });
});
