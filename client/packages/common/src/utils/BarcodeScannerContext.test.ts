import { parseBarcodeData, parseResult } from './BarcodeScannerContext';

describe('barcode parsing', () => {
  it('parses UPC-A', () => {
    const barcode = new Array(12).fill(56);
    const result = parseBarcodeData(barcode);
    expect(result).toBe('88888888');
  });

  it('parses GTIN-128 with 0', () => {
    const barcode = [
      40, 16, 3, 0, 48, 49, 49, 48, 56, 52, 55, 57, 55, 54, 48, 48, 48, 48, 52,
      48, 49, 51, 49, 57, 49, 49, 50, 48, 49, 48, 65, 66, 67, 49, 50, 51, 52, 0,
      37, 11, 0, 0, 0, 0, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0,
    ];
    const result = parseBarcodeData(barcode);
    expect(result).toBe('01108479760000401319112010ABC1234');
  });

  it('parses GTIN-128 with 22', () => {
    const barcode = [
      40, 16, 3, 0, 48, 49, 49, 48, 56, 52, 55, 57, 55, 54, 48, 48, 48, 48, 52,
      48, 49, 51, 49, 57, 49, 49, 50, 48, 49, 48, 65, 66, 67, 49, 50, 51, 52,
      22, 37, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0,
    ];
    const result = parseBarcodeData(barcode);
    expect(result).toBe('01108479760000401319112010ABC1234');
  });
});

describe('GS1 parsing', () => {
  const barcode = '01095011015300031714070410AB-123';
  it('parses GTIN', () => {
    const result = parseResult(barcode);
    expect(result.gtin).toBe('09501101530003');
  });

  it('parses batch', () => {
    const result = parseResult(barcode);
    expect(result.batch).toBe('AB-123');
  });

  it('parses expiry', () => {
    const result = parseResult(barcode);
    expect(result.expiryDate).toBe('2014-07-04');
  });
});

describe('Data matrix parsing', () => {
  // const barcode = '010031414199999521100000002341715012510987654321GFEDCBA';
  const barcode = '010031414199999521100000002341715012510987654321GFEDCBA';
  it('parses GTIN', () => {
    const result = parseResult(barcode);
    expect(result.gtin).toBe('00314141999995');
  });

  it('parses batch', () => {
    const result = parseResult(barcode);
    expect(result.batch).toBe('987654321GFEDCBA');
  });

  it('parses expiry', () => {
    const result = parseResult(barcode);
    expect(result.expiryDate).toBe('2015-01-25');
  });
});
