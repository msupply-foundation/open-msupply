import { HeaderValue } from './IndicatorsDemographics';
import { recursiveCalculate } from './utils';

describe('recursiveCalculate', () => {
  it('calculates index value', () => {
    let key = 0;
    const headerData = [
      { id: '1', value: 1.1 },
      { id: '2', value: 1.2 },
    ];
    const draftHeaders: Record<string, HeaderValue> = {};
    headerData.forEach(header => (draftHeaders[header.id] = { ...header }));
    const row = {
      isNew: false,
      id: '1',
      percentage: 20,
      name: 'name',
      baseYear: 2000,
      basePopulation: 1000,
      0: 200,
      1: 202,
      2: 202,
      3: 202,
      4: 202,
    };
    const indexValue = 1000;
    expect(recursiveCalculate(key, draftHeaders, row, indexValue)).toBe(200);
    key = 1;
    expect(recursiveCalculate(key, draftHeaders, row, indexValue)).toBe(202);
    key = 2;
    expect(recursiveCalculate(key, draftHeaders, row, indexValue)).toBe(204);
  });
});
