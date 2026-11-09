import { describe, expect, it } from 'vitest';
import { barcodeFieldFill } from './barcodeField';
import { readText } from './readScan';

// spec/barcode-scanning/rules.md § Setting a code on a stock line.
const today = new Date('2026-09-23');
const GS = '\u001d';

describe('barcodeFieldFill', () => {
  it('.49 fills the code, the batch and the expiry from a structured label', () => {
    const scan = readText(`]d20105012345678900${GS}10AB12${GS}17271231`);
    expect(barcodeFieldFill(scan, today)).toEqual({
      barcode: '05012345678900',
      batch: 'AB12',
      expiryDate: '2027-12-31',
    });
  });

  it('.50 leaves the made-on date untouched', () => {
    const scan = readText(`]d20105012345678900${GS}11250101${GS}17271231`);
    expect(barcodeFieldFill(scan, today)).not.toHaveProperty('manufactureDate');
  });

  it('fills only the code from raw content, leaving batch and expiry alone', () => {
    expect(barcodeFieldFill(readText('WH-000123'), today)).toEqual({
      barcode: 'WH-000123',
    });
  });

  it('.67 a structured label without an item number sets no code', () => {
    const scan = readText(`]d210AB12${GS}17271231`);
    expect(barcodeFieldFill(scan, today)).toEqual({
      batch: 'AB12',
      expiryDate: '2027-12-31',
    });
  });

  it('.68 an empty scan fills nothing', () => {
    expect(barcodeFieldFill(readText(''), today)).toEqual({});
  });
});
