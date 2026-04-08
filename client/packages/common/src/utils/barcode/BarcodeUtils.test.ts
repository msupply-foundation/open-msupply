import { BarcodeUtils } from './BarcodeUtils';

describe('BarcodeUtils', () => {
  describe('parseBarcodeFromBytes', () => {
    it('parses UPC-A from byte array', () => {
      const barcode = [40, 16, 3, 0, ...new Array(8).fill(56), 0];
      const result = BarcodeUtils.parseBarcodeFromBytes(barcode);
      expect(result).toBe('88888888');
    });

    it('parses GTIN-128 with NULL terminator', () => {
      const barcode = [
        40, 16, 3, 0, 48, 49, 49, 48, 56, 52, 55, 57, 55, 54, 48, 48, 48, 48,
        52, 48, 49, 51, 49, 57, 49, 49, 50, 48, 49, 48, 65, 66, 67, 49, 50, 51,
        52, 0, 37, 11,
      ];
      const result = BarcodeUtils.parseBarcodeFromBytes(barcode);
      expect(result).toBe('01108479760000401319112010ABC1234');
    });

    it('parses GTIN-128 with SYN terminator (0x16/22)', () => {
      const barcode = [
        40, 16, 3, 0, 48, 49, 49, 48, 56, 52, 55, 57, 55, 54, 48, 48, 48, 48,
        52, 48, 49, 51, 49, 57, 49, 49, 50, 48, 49, 48, 65, 66, 67, 49, 50, 51,
        52, 22, 37, 11,
      ];
      const result = BarcodeUtils.parseBarcodeFromBytes(barcode);
      expect(result).toBe('01108479760000401319112010ABC1234');
    });

    it('handles empty or short byte arrays', () => {
      expect(BarcodeUtils.parseBarcodeFromBytes(undefined)).toBeUndefined();
      expect(BarcodeUtils.parseBarcodeFromBytes([])).toBeUndefined();
      expect(BarcodeUtils.parseBarcodeFromBytes([1, 2, 3])).toBeUndefined();
    });

    it('removes leading FNC1 if present after byte conversion', () => {
      // Byte array that includes FNC1 (29) after header
      const barcode = [
        40, 16, 3, 0, 29, 48, 49, 48, 57, 53, 48, 54, 54, 56, 50, 49, 48, 49,
        51, 53, 50, 0,
      ];
      const result = BarcodeUtils.parseBarcodeFromBytes(barcode);
      // Should remove leading FNC1 (29)
      expect(result).toBe('0109506682101352');
    });
  });

  describe('parseGS1Barcode', () => {
    it('parses a valid GS1 barcode with multiple AIs', async () => {
      const barcode = '01095066821013521729100310test\x1D21532';
      const result = await BarcodeUtils.parseGS1Barcode(barcode);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);

      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      expect(gtin?.data).toBe('09506682101352');

      const batch = result.parsedCodeItems?.find(item => item.ai === '10');
      expect(batch?.data).toBe('test');

      const serial = result.parsedCodeItems?.find(item => item.ai === '21');
      expect(serial?.data).toBe('532');
    });

    it('handles barcode with leading FNC1 character', async () => {
      const barcodeWithFNC1 = '\x1D01095066821343501728080410batch21532';
      const result = await BarcodeUtils.parseGS1Barcode(barcodeWithFNC1);

      expect(result.parsedCodeItems).toBeDefined();
      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      expect(gtin?.data).toBe('09506682134350');
    });

    it('removes zero-width characters', async () => {
      const barcodeWithZeroWidth =
        '\u200B01095066821013521729100310test\u200D21532';
      const result = await BarcodeUtils.parseGS1Barcode(barcodeWithZeroWidth);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);
    });

    it('trims leading and trailing whitespace', async () => {
      const barcodeWithSpaces = '  01095066821013521729100310test21532  ';
      const result = await BarcodeUtils.parseGS1Barcode(barcodeWithSpaces);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);
    });

    it('returns empty result for invalid barcode', async () => {
      const invalidBarcode = 'not-a-valid-gs1-barcode';
      const result = await BarcodeUtils.parseGS1Barcode(invalidBarcode);

      expect(result.parsedCodeItems).toEqual([]);
      expect(result.codeName).toBe('');
    });
  });
});
