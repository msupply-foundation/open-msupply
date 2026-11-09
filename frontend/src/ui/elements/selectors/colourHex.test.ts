import { describe, expect, it } from 'vitest';
import { isValidHexColour, normaliseHexColour } from './colourHex';

// SET-05.40: six hex digits, `#` optional on entry, committed lowercase
// `#`-prefixed; anything else is refused.
describe('isValidHexColour', () => {
  it('accepts six hex digits with or without the #', () => {
    expect(isValidHexColour('#004fc4')).toBe(true);
    expect(isValidHexColour('004fc4')).toBe(true);
    expect(isValidHexColour('#FFCC00')).toBe(true);
    expect(isValidHexColour('  #004fc4  ')).toBe(true);
  });

  it('refuses anything that is not exactly six hex digits', () => {
    expect(isValidHexColour('')).toBe(false);
    expect(isValidHexColour('#fff')).toBe(false); // shorthand not offered
    expect(isValidHexColour('#004fc44')).toBe(false);
    expect(isValidHexColour('#00 fc4')).toBe(false);
    expect(isValidHexColour('#00gfc4')).toBe(false);
    expect(isValidHexColour('blue')).toBe(false);
  });
});

describe('normaliseHexColour', () => {
  it('commits trimmed, #-prefixed, lowercase', () => {
    expect(normaliseHexColour('004FC4')).toBe('#004fc4');
    expect(normaliseHexColour('#FFCC00')).toBe('#ffcc00');
    expect(normaliseHexColour('  #004fc4  ')).toBe('#004fc4');
  });
});
