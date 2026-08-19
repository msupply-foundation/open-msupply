import { describe, expect, it } from 'vitest';
import { footerColourStyle } from './footerColour';

// The bottom bar's custom store colour (spec/chrome § bottom bar,
// OMS-REG-FTR-02.7): a parseable hex colour applies with contrast-derived
// text; anything else leaves the bar's default.
describe('footerColourStyle', () => {
  it('applies a 6-digit hex with white text on a dark background', () => {
    expect(footerColourStyle('#000000')).toEqual({
      background: '#000000',
      text: '#ffffff',
    });
    expect(footerColourStyle('#004fc4')).toEqual({
      background: '#004fc4',
      text: '#ffffff',
    });
  });

  it('picks dark text on a light background', () => {
    expect(footerColourStyle('#ffcc00')).toEqual({
      background: '#ffcc00',
      text: '#000000',
    });
    expect(footerColourStyle('#ffffff')).toEqual({
      background: '#ffffff',
      text: '#000000',
    });
  });

  it('expands a 3-digit hex and tolerates case/whitespace', () => {
    expect(footerColourStyle(' #F00 ')).toEqual({
      background: '#ff0000',
      text: '#ffffff',
    });
  });

  it('ignores unset and unparseable values (the bar keeps its default)', () => {
    expect(footerColourStyle(undefined)).toBeUndefined();
    expect(footerColourStyle('')).toBeUndefined();
    expect(footerColourStyle('red')).toBeUndefined();
    expect(footerColourStyle('#257A2')).toBeUndefined(); // incomplete hex
    expect(footerColourStyle('rgb(0, 0, 0)')).toBeUndefined();
  });
});
