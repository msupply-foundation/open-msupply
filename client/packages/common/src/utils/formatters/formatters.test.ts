import { Formatter } from './formatters';
import { addMilliseconds } from 'date-fns';
import { getTimezoneOffset } from 'date-fns-tz';

describe('Formatter', () => {
  it('is defined', () => {
    expect(Formatter.csv).toBeDefined();
    expect(Formatter.csvDateString).toBeDefined();
    expect(Formatter.expiryDate).toBeDefined();
    expect(Formatter.expiryDateString).toBeDefined();
    expect(Formatter.naiveDate).toBeDefined();
    expect(Formatter.toIsoString).toBeDefined();
    expect(Formatter.tax).toBeDefined();
  });

  it('csvDateString', () => {
    expect(Formatter.csvDateString(null)).toBe('');
    expect(Formatter.csvDateString(undefined)).toBe('');
    expect(Formatter.csvDateString('bah')).toBe('');
    expect(Formatter.csvDateString('2022/03/30')).toBe('30/03/2022');
    expect(Formatter.csvDateString('2020/10/12 04:30')).toBe('12/10/2020');
  });

  it('csvDateTimeString', () => {
    expect(Formatter.csvDateTimeString(null)).toBe('');
    expect(Formatter.csvDateTimeString(undefined)).toBe('');
    expect(Formatter.csvDateTimeString('bah')).toBe('');
    expect(Formatter.csvDateTimeString('2022/03/30')).toBe(
      '30/03/2022 00:00:00'
    );
    expect(Formatter.csvDateTimeString('2020/10/12 04:30')).toBe(
      '12/10/2020 04:30:00'
    );
  });

  it('expiryDate', () => {
    expect(Formatter.expiryDate(null)).toBe(null);
    expect(Formatter.expiryDate(new Date('2022/01/20'))).toBe('01/2022');
  });

  it('expiryDateString', () => {
    expect(Formatter.expiryDateString(null)).toBe('');
    expect(Formatter.expiryDateString('oops')).toBe('');
    expect(Formatter.expiryDateString('2022/01/20')).toBe('01/2022');
  });

  it('naiveDate', () => {
    expect(Formatter.naiveDate(null)).toBe(null);
    expect(Formatter.naiveDate(new Date('1984/3/13'))).toBe('1984-03-13');
  });

  it('naiveDateTime', () => {
    const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localalisedStartOfDay = new Date('1984/3/13');
    const utcStartOfDay = addMilliseconds(
      localalisedStartOfDay,
      getTimezoneOffset(timeZone, localalisedStartOfDay)
    );
    expect(Formatter.toIsoString(utcStartOfDay)).toBe(
      '1984-03-13T00:00:00.000Z'
    );
    const localisedNewDate = new Date('1984/3/13 11:12:13');
    const utcNewDate = addMilliseconds(
      localisedNewDate,
      getTimezoneOffset(timeZone, localisedNewDate)
    );
    expect(Formatter.toIsoString(utcNewDate)).toBe('1984-03-13T11:12:13.000Z');
    expect(Formatter.toIsoString(null)).toBe(null);
  });

  it('tax', () => {
    expect(Formatter.tax(12)).toBe('(12.00%)');
    expect(Formatter.tax(12, false)).toBe('12.00%');
    expect(Formatter.tax(12.5)).toBe('(12.50%)');
  });

  it('sentenceCase', () => {
    expect(Formatter.sentenceCase('hello world')).toBe('Hello World');
    expect(Formatter.sentenceCase('SHOUTY')).toBe('Shouty');
    expect(Formatter.sentenceCase('SHOUTY CASE IS BEST')).toBe(
      'Shouty Case Is Best'
    );
  });
});
