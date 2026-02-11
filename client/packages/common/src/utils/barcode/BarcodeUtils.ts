import {
  Gs1Barcode as LibGs1Barcode,
  parseBarcode,
} from 'gs1-barcode-parser-mod';

export type Gs1Barcode = LibGs1Barcode;

export const BarcodeUtils = {
  parseGS1Barcode: (barcode: string): Gs1Barcode => {
    const cleanedBarcode = cleanBarcodeString(barcode);

    try {
      const gs1 = parseBarcode(cleanedBarcode);
      return gs1;
    } catch (error) {
      console.error('Library GS1 parsing failed:', error);
      // Return empty result if parsing fails
      return { codeName: '', parsedCodeItems: [] };
    }
  },
};

// Helper function to clean barcode strings
const cleanBarcodeString = (barcode: string): string => {
  // Remove control characters EXCEPT FNC1 (0x1D/ASCII 29)
  // FNC1 is required as field separator for variable-length GS1 elements

  const FNC1 = String.fromCharCode(29);

  let cleaned = barcode
    // Remove NULL bytes and other control chars (but NOT 0x1D/ASCII 29 = FNC1)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1C\x1E-\x1F\x7F-\x9F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Trim whitespace from start/end only
    .trim();

  // Remove leading FNC1 character if present
  // Camera scanners add FNC1 at start, but library expects raw AI or symbology identifier
  if (cleaned.startsWith(FNC1)) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
};
