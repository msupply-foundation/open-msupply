import { getCellValues, computeTotal, setMax } from './MultiNumberInputCell';

const monthYearUnits = [
  { key: 'year', ratio: 12, label: 'Y' },
  { key: 'month', ratio: 1, label: 'M' },
];

const hourMinuteSecondUnits = [
  {
    key: 'hour',
    ratio: 3600,
    label: 'H',
  },
  {
    key: 'minute',
    ratio: 60,
    label: 'M',
  },
  {
    key: 'second',
    ratio: 1,
    label: 'S',
  },
];

// 2 values
describe('2 units - years/months - splitting', () => {
  it('24 months', () => {
    expect(getCellValues(24, monthYearUnits)).toStrictEqual([2, 0]);
  });
  it('0 months', () => {
    expect(getCellValues(0, monthYearUnits)).toStrictEqual([0, 0]);
  });
  it('18 months', () => {
    expect(getCellValues(18, monthYearUnits)).toStrictEqual([1, 6]);
  });
  it('100 months', () => {
    expect(getCellValues(100, monthYearUnits)).toStrictEqual([8, 4]);
  });
  it('66.6 months', () => {
    expect(getCellValues(66.6, monthYearUnits)).toStrictEqual([5, 6.6]);
  });
});

describe('2 units - years/months - recombining', () => {
  it('24 months', () => {
    expect(computeTotal([2, 0], monthYearUnits)).toBe(24);
  });
  it('0 months', () => {
    expect(computeTotal([0, 0], monthYearUnits)).toBe(0);
  });
  it('100 months', () => {
    expect(computeTotal([8, 4], monthYearUnits)).toBe(100);
  });
  it('Months more than 12', () => {
    expect(computeTotal([1, 36], monthYearUnits)).toBe(48);
  });
  it('66.6 months', () => {
    expect(computeTotal([5, 6.6], monthYearUnits)).toBe(66.6);
  });
  it('66.6 months', () => {
    expect(computeTotal([5, 6.6], monthYearUnits)).toBe(66.6);
  });
});

// 3 values
describe('3 units - hours/minutes/seconds - splitting', () => {
  it('3600 seconds', () => {
    expect(getCellValues(3600, hourMinuteSecondUnits)).toStrictEqual([1, 0, 0]);
  });
  it('0 seconds', () => {
    expect(getCellValues(0, hourMinuteSecondUnits)).toStrictEqual([0, 0, 0]);
  });
  it('7199 seconds', () => {
    expect(getCellValues(7199, hourMinuteSecondUnits)).toStrictEqual([
      1, 59, 59,
    ]);
  });
  it('Just over a day', () => {
    expect(getCellValues(86401, hourMinuteSecondUnits)).toStrictEqual([
      24, 0, 1,
    ]);
  });
  it('Fractional seconds', () => {
    expect(getCellValues(7543.5, hourMinuteSecondUnits)).toStrictEqual([
      2, 5, 43.5,
    ]);
  });
});

describe('3 units - hours/minutes/seconds - recombining', () => {
  it('1 hour', () => {
    expect(computeTotal([1, 0, 0], hourMinuteSecondUnits)).toBe(3600);
  });
  it('0 seconds', () => {
    expect(computeTotal([0, 0, 0], hourMinuteSecondUnits)).toBe(0);
  });
  it('7199 seconds', () => {
    expect(computeTotal([1, 59, 59], hourMinuteSecondUnits)).toBe(7199);
  });
  it('Just over a day', () => {
    expect(computeTotal([24, 0, 1], hourMinuteSecondUnits)).toBe(86401);
  });
  it('Values higher than ratios', () => {
    expect(computeTotal([3, 75, 500], hourMinuteSecondUnits)).toBe(15800);
  });
  it('Middle value exceeding limit with decimals', () => {
    expect(computeTotal([1, 59.99, 1], hourMinuteSecondUnits)).toBe(7200.4);
  });
});

describe('Testing "setMax function', () => {
  it('Limit first value to defined maximum', () => {
    expect(setMax(monthYearUnits, 0, 5000)).toBe(5000);
    expect(setMax(hourMinuteSecondUnits, 0, 5000)).toBe(5000);
  });
  it('No limit on first value when max not defined', () => {
    expect(setMax(monthYearUnits, 0, undefined)).toBe(undefined);
    expect(setMax(hourMinuteSecondUnits, 0, undefined)).toBe(undefined);
  });
  it('Last value accept up to 4dp, but less than ratio limit', () => {
    // Max value does nothing when not the first value
    expect(setMax(monthYearUnits, 1, -1)).toBe(11.9999);
    expect(setMax(hourMinuteSecondUnits, 2, -1)).toBe(59.9999);
  });
  it('Middle value limited to integer below next ratio', () => {
    // Max value does nothing when not the first value
    expect(setMax(hourMinuteSecondUnits, 1, -1)).toBe(59);
  });
});
