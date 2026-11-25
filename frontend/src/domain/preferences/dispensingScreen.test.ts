import { describe, expect, it } from 'vitest';
import { asDispensingScreen } from './dispensingScreen';

describe('asDispensingScreen', () => {
  it('reads Simple as Simple, and anything else as the default, Standard (OMS-REG-DIS-12.181)', () => {
    expect(asDispensingScreen('SIMPLE')).toBe('SIMPLE');
    expect(asDispensingScreen('STANDARD')).toBe('STANDARD');
    // A screen a later version adds, or nothing read yet.
    expect(asDispensingScreen('TODAY')).toBe('STANDARD');
    expect(asDispensingScreen(undefined)).toBe('STANDARD');
    expect(asDispensingScreen(null)).toBe('STANDARD');
  });
});
