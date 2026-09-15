import { getMinMaxDates } from './DateFilter';

describe('getMinMaxDates', () => {
  it('should return provided min and max dates when no query object', () => {
    const query = '';
    const range = 'from';
    const min = '2025-09-01';
    const max = '2025-11-01';

    const result = getMinMaxDates(query, range, min, max);

    expect(result).toEqual({
      minDate: new Date('2025-09-01'),
      maxDate: new Date('2025-11-01'),
    });
  });
  it('should return provided min and max dates when no range', () => {
    const query = { from: '2025-10-01', to: '2025-10-31' };
    const range = undefined;
    const min = '2025-09-01';
    const max = '2025-11-01';

    const result = getMinMaxDates(query, range, min, max);

    expect(result).toEqual({
      minDate: new Date('2025-09-01'),
      maxDate: new Date('2025-11-01'),
    });
  });

  describe('when range is "from"', () => {
    it('max date should be the "to" value from query when no max provided', () => {
      const query = { to: '2025-10-31' };
      const range = 'from';
      const min = undefined;
      const max = undefined;

      const result = getMinMaxDates(query, range, min, max);

      expect(result).toEqual({
        minDate: undefined,
        maxDate: new Date('2025-10-31'),
      });
    });
    it('should return max date from input when no to date set in query', () => {
      const query = {};
      const range = 'from';
      const min = undefined;
      const max = '2025-11-01';

      const result = getMinMaxDates(query, range, min, max);

      expect(result).toEqual({
        minDate: undefined,
        maxDate: new Date('2025-11-01'),
      });
    });
    it('should return closer of the two max dates when both are set', () => {
      const query = { to: '2025-10-31' };
      const range = 'from';
      const min = undefined;
      const max = '2025-11-01';

      const result = getMinMaxDates(query, range, min, max);

      expect(result).toEqual({
        minDate: undefined,
        maxDate: new Date('2025-10-31'),
      });
    });
  });

  describe('when range is "to"', () => {
    it('min date should be the "from" value from query when no min provided', () => {
      const query = { from: '2025-10-01' };
      const range = 'to';
      const min = undefined;
      const max = undefined;

      const result = getMinMaxDates(query, range, min, max);

      expect(result).toEqual({
        minDate: new Date('2025-10-01'),
        maxDate: undefined,
      });
    });
    it('should return min date from input when no from date set in query', () => {
      const query = {};
      const range = 'to';
      const min = '2025-09-01';
      const max = undefined;

      const result = getMinMaxDates(query, range, min, max);

      expect(result).toEqual({
        minDate: new Date('2025-09-01'),
        maxDate: undefined,
      });
    });
    it('should return closer of the two min dates when both are set', () => {
      const query = { from: '2025-10-01' };
      const range = 'to';
      const min = '2025-09-01';
      const max = undefined;

      const result = getMinMaxDates(query, range, min, max);

      expect(result).toEqual({
        minDate: new Date('2025-10-01'),
        maxDate: undefined,
      });
    });
  });
});
