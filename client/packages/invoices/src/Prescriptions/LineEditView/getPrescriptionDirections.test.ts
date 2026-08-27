import { getPrescriptionDirections } from './getPrescriptionDirections';

const options = [
  { id: '1', text: '2t', expansion: 'Take TWO tablets' },
  { id: '2', text: '1m', expansion: 'ONE month' },
  { id: '3', text: 'tds', expansion: 'THREE times a day' },
];

describe('getPrescriptionDirections', () => {
  describe('abbreviations entered (create)', () => {
    it('should return the expanded direction', () => {
      const input = '2t tds';
      expect(getPrescriptionDirections(input, options)).toBe(
        'Take TWO tablets THREE times a day'
      );
    });
    it('abbreviations should not be case sensitive', () => {
      const input = '2T TDS';
      expect(getPrescriptionDirections(input, options)).toBe(
        'Take TWO tablets THREE times a day'
      );
    });
    it('should return strings if they are not an abbreviation, in the same case as entered', () => {
      const input = 'Take HALF a tablet each AM';
      expect(getPrescriptionDirections(input, options)).toBe(
        'Take HALF a tablet each AM'
      );
    });
    it('should return both the expanded direction and non abbreviation strings in the same direction', () => {
      const input = '2t daily for 1m';
      expect(getPrescriptionDirections(input, options)).toBe(
        'Take TWO tablets daily for ONE month'
      );
    });
  });
});
