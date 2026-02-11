import { BarcodeUtils } from './BarcodeUtils';

describe('BarcodeUtils', () => {
  describe('parseGS1Barcode', () => {
    it('parses a valid GS1 barcode with multiple AIs', () => {
      // Standard GS1 barcode: GTIN + Expiry + Batch + Serial
      const barcode = '01095066821013521729100310test\x1D21532';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);

      // Check GTIN (AI 01)
      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      expect(gtin?.data).toBe('09506682101352');

      // Check Batch (AI 10)
      const batch = result.parsedCodeItems?.find(item => item.ai === '10');
      expect(batch?.data).toBe('test');

      // Check Serial (AI 21)
      const serial = result.parsedCodeItems?.find(item => item.ai === '21');
      expect(serial?.data).toBe('532');
    });

    it('handles barcode with leading FNC1 character', () => {
      // Camera scanners often add FNC1 at the start
      const barcodeWithFNC1 = '\x1D01095066821343501728080410batch21532';
      const result = BarcodeUtils.parseGS1Barcode(barcodeWithFNC1);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);

      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      expect(gtin?.data).toBe('09506682134350');
    });

    it('handles barcode without FNC1 separators', () => {
      // Some barcodes may not have FNC1 between fixed-length fields
      const barcode = '0109506682101352172910031021532';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      expect(result.parsedCodeItems).toBeDefined();
      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      expect(gtin).toBeDefined();
    });

    it('removes control characters except FNC1', () => {
      // Barcode with null bytes and other control chars
      const barcodeWithControlChars =
        '\x00\x0101095066821013521729100310test\x1D21532\x7F';
      const result = BarcodeUtils.parseGS1Barcode(barcodeWithControlChars);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);
    });

    it('removes zero-width characters', () => {
      // Barcode with zero-width spaces
      const barcodeWithZeroWidth =
        '\u200B01095066821013521729100310test\u200D21532';
      const result = BarcodeUtils.parseGS1Barcode(barcodeWithZeroWidth);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);
    });

    it('trims leading and trailing whitespace', () => {
      const barcodeWithSpaces = '  01095066821013521729100310test21532  ';
      const result = BarcodeUtils.parseGS1Barcode(barcodeWithSpaces);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);
    });

    it('handles barcode with date fields (AI 17)', () => {
      // GTIN + Expiry date (YYMMDD)
      const barcode = '01095066821013521729100310batch';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      const expiry = result.parsedCodeItems?.find(item => item.ai === '17');
      expect(expiry).toBeDefined();
      expect(expiry?.data).toBeInstanceOf(Date);
    });

    it('handles barcode with quantity and pack size (AI 30, 37)', () => {
      const barcode = '0109506682101352\x1D3012\x1D3710';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      const quantity = result.parsedCodeItems?.find(item => item.ai === '30');
      const packSize = result.parsedCodeItems?.find(item => item.ai === '37');

      expect(quantity?.data).toBe('12');
      expect(packSize?.data).toBe('10');
    });

    it('returns empty result for invalid barcode', () => {
      const invalidBarcode = 'not-a-valid-gs1-barcode';
      const result = BarcodeUtils.parseGS1Barcode(invalidBarcode);

      expect(result.parsedCodeItems).toEqual([]);
      expect(result.codeName).toBe('');
    });

    it('returns empty result for empty string', () => {
      const result = BarcodeUtils.parseGS1Barcode('');

      expect(result.parsedCodeItems).toEqual([]);
    });

    it('handles barcode with symbology identifier', () => {
      // Some scanners add ]d2 prefix for GS1 DataMatrix
      const barcodeWithSymbology = ']d201095066821013521729100310test';
      const result = BarcodeUtils.parseGS1Barcode(barcodeWithSymbology);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.codeName).toBe('GS1 DataMatrix');
    });

    it('preserves embedded FNC1 characters', () => {
      // FNC1 between variable-length fields should be preserved
      const barcode = '0109506682101352\x1D10batch\x1D21serial';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      expect(result.parsedCodeItems?.length).toBeGreaterThanOrEqual(3);

      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      const batch = result.parsedCodeItems?.find(item => item.ai === '10');
      const serial = result.parsedCodeItems?.find(item => item.ai === '21');

      expect(gtin?.data).toBe('09506682101352');
      expect(batch?.data).toBe('batch');
      expect(serial?.data).toBe('serial');
    });

    it('handles complex real-world barcode', () => {
      // Real barcode from tablet scan: GTIN + Expiry + Batch + Serial
      const realBarcode = '\x1D01095066821343501728080410dfdf\x1D21532';
      const result = BarcodeUtils.parseGS1Barcode(realBarcode);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBe(4);

      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      const expiry = result.parsedCodeItems?.find(item => item.ai === '17');
      const batch = result.parsedCodeItems?.find(item => item.ai === '10');
      const serial = result.parsedCodeItems?.find(item => item.ai === '21');

      expect(gtin?.data).toBe('09506682134350');
      expect(expiry?.data).toBeInstanceOf(Date);
      expect(batch?.data).toBe('dfdf');
      expect(serial?.data).toBe('532');
    });

    it('handles multiple leading control characters', () => {
      const barcode = '\x00\x1D\x02010950668210135217291003';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);
    });

    it('handles barcode with only GTIN', () => {
      const barcode = '01095066821013521729100310batch';
      const result = BarcodeUtils.parseGS1Barcode(barcode);

      expect(result.parsedCodeItems).toBeDefined();
      expect(result.parsedCodeItems?.length).toBeGreaterThan(0);

      const gtin = result.parsedCodeItems?.find(item => item.ai === '01');
      expect(gtin?.data).toBe('09506682101352');
    });
  });
});
