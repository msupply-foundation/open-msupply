import {
  Gs1Barcode as LibGs1Barcode,
  parseBarcode,
} from 'gs1-barcode-parser-mod';

export type Gs1Barcode = LibGs1Barcode;

export const BarcodeUtils = {
  /**
   * Parse GS1 barcode string into its components
   * Returns empty result if parsing fails
   */
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

  /**
   * Convert USB scanner byte array to string
   * USB scanners (Electron) return barcode data as number[] with protocol framing
   */
  parseBarcodeFromBytes: (data: number[] | undefined): string | undefined => {
    if (!data || data.length < 5) return undefined;

    // USB scanner protocol:
    // - First 4 bytes: header/metadata
    // - 0x16 (22): Synchronous Idle character (end marker in continuous mode)
    // - 0x00: NULL byte (terminator)

    const synchronousIdleIndex = findByteIndex(22, data);
    const payload = data.slice(4, synchronousIdleIndex);
    const zeroIndex = findByteIndex(0, payload);
    const trimmedPayload = payload.slice(0, zeroIndex);

    const bytesString = trimmedPayload.reduce(
      (barcode, curr) => barcode + String.fromCharCode(curr),
      ''
    );

    return cleanBarcodeString(bytesString);
  },
};

// Helper function to find byte in array
const findByteIndex = (byte: number, data: number[]): number | undefined => {
  const index = data.indexOf(byte);
  return index === -1 ? undefined : index;
};

// Helper function to clean barcode strings
const cleanBarcodeString = (barcode: string): string => {
  if (!barcode) return '';

  const FNC1 = String.fromCharCode(29);

  let cleaned = barcode
    // Remove zero-width characters (invisible unicode characters)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Trim whitespace from start/end only
    .trim();

  // Remove leading FNC1 character if present
  // Honeywell scanners able to scan barcodes properly, no issue with leading FNC1
  // Camera scanners add FNC1 at start, but GS1 library doesn't expects it there
  // USB scanners typically don't have leading FNC1 after byte conversion
  if (cleaned.startsWith(FNC1)) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
};
