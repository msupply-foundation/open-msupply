import { handleAbbreviations } from './getPrescriptionDirections';

const options = [
  { id: '1', name: '2t', direction: 'Take TWO tablets' },
  { id: '2', name: '1m', direction: 'ONE month' },
  { id: '3', name: 'tds', direction: 'THREE times a day' },
];

describe('handleAbbreviations', () => {
  describe('abbreviations entered (create)', () => {
    it('should return the expanded direction', () => {
      const input = '2t tds';
      expect(handleAbbreviations(input, options)).toBe(
        'Take TWO tablets THREE times a day'
      );
    });
  });
});
