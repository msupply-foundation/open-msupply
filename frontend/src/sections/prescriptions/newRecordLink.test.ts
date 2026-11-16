import { describe, expect, it } from 'vitest';
import { newRecordHref, newRecordRequest } from './newRecordLink';

describe('the Simple screen hands a new dispensing record to the list', () => {
  const list = '/store-1/dispensary/dispensing';

  it('OMS-REG-DIS-12.114: names the chosen patient', () => {
    const href = newRecordHref(list, 'patient 7');
    expect(href).toBe(
      '/store-1/dispensary/dispensing?new-record=1&patient=patient+7'
    );
    const params = Object.fromEntries(
      new URLSearchParams(href.split('?')[1]).entries()
    );
    expect(newRecordRequest(params)).toEqual({ patientId: 'patient 7' });
  });

  it('OMS-REG-DIS-12.3: with nobody chosen, opens the dialog with no patient', () => {
    expect(newRecordHref(list)).toBe(`${list}?new-record=1`);
    expect(newRecordRequest({ 'new-record': '1' })).toEqual({});
  });

  it('OMS-REG-DIS-12.115: a list address without the hand-off opens nothing', () => {
    expect(newRecordRequest({})).toBeUndefined();
    expect(newRecordRequest({ patient: 'patient-7' })).toBeUndefined();
  });
});
