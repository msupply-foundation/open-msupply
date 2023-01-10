declare module 'gs1-barcode-parser-mod' {
  interface Gs1Element {
    ai: string;
    title: string;
    data: Date | string | number;
    unit: string;
  }
  interface Gs1Barcode {
    codeName?: string;
    parsedCodeItems: Gs1Element[];
  }

  function parseBarcode(barcode?: string): Gs1Barcode;
}
