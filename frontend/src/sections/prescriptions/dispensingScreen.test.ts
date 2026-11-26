import { describe, expect, it } from 'vitest';
import {
  atSimpleAddress,
  dispensingScreenRoute,
  notFoundReturnMessage,
} from './dispensingScreen';

// spec/prescriptions rules › the Simple screen, ui-surface S9 › opens
describe('what an address under Dispensing opens', () => {
  it("tells the Simple screen's own addresses from Dispensing's", () => {
    expect(atSimpleAddress('/store-1/dispensary/dispensing')).toBe(false);
    expect(atSimpleAddress('/store-1/dispensary/dispensing/records')).toBe(
      false
    );
    expect(atSimpleAddress('/store-1/dispensary/dispensing/abc')).toBe(false);
    expect(atSimpleAddress('/store-1/dispensary/dispensing/simple')).toBe(true);
    expect(atSimpleAddress('/store-1/dispensary/dispensing/simple/abc')).toBe(
      true
    );
    // A record whose id starts with the word is still a record.
    expect(atSimpleAddress('/store-1/dispensary/dispensing/simpleton')).toBe(
      false
    );
  });

  // OMS-REG-DIS-12.182, .371: the Simple screen is served at Dispensing's own
  // address, with nothing to send Escape's way up straight back.
  it("opens the Simple screen at Dispensing's own address in a Simple store", () => {
    expect(dispensingScreenRoute('SIMPLE', false, undefined)).toEqual({
      kind: 'simple',
    });
  });

  // OMS-REG-DIS-12.270: a dispensed visit open on the Simple screen.
  it('opens a dispensed visit on the Simple screen in a Simple store', () => {
    expect(dispensingScreenRoute('SIMPLE', true, 'abc')).toEqual({
      kind: 'simple',
    });
  });

  it("sends the Simple screen's old address to Dispensing's own", () => {
    expect(dispensingScreenRoute('SIMPLE', true, undefined)).toEqual({
      kind: 'redirect',
      to: '',
    });
  });

  // OMS-REG-DIS-12.1
  it("opens the list at Dispensing's own address in a Standard store", () => {
    expect(dispensingScreenRoute('STANDARD', false, undefined)).toEqual({
      kind: 'list',
    });
  });

  // OMS-REG-DIS-12.185, .282
  it("sends the Simple screen's addresses to the list, or a visit's to its record, in a Standard store", () => {
    expect(dispensingScreenRoute('STANDARD', true, undefined)).toEqual({
      kind: 'redirect',
      to: '',
    });
    expect(dispensingScreenRoute('STANDARD', true, 'abc')).toEqual({
      kind: 'redirect',
      to: '/abc',
    });
  });
});

// ui-surface S3, S7
describe("a missing dispensing record's message", () => {
  // OMS-REG-DIS-12.369
  it('says it returns to Dispensing in a Simple store', () => {
    expect(notFoundReturnMessage('SIMPLE')).toBe(
      'messages.click-to-return-to-dispensing'
    );
  });

  // OMS-REG-DIS-03.53
  it('says it returns to the list in any other store', () => {
    expect(notFoundReturnMessage('STANDARD')).toBe(
      'messages.click-to-return-to-prescriptions'
    );
    expect(notFoundReturnMessage(undefined)).toBe(
      'messages.click-to-return-to-prescriptions'
    );
  });
});
