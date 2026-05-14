import { Formatter } from '../formatters';
import { Gs1Barcode, BarcodeUtils } from './BarcodeUtils';

export interface ScanResult {
  content?: string; // Raw barcode content
  gs1?: Gs1Barcode; // Full GS1 barcode object
  gs1string?: string;
  gtin?: string;
  batch?: string;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  packSize?: number;
  quantity?: number;
}

export const parseResult = (content?: string): ScanResult => {
  if (!content) return {};

  try {
    const gs1 = BarcodeUtils.parseGS1Barcode(content);

    // If no items were parsed, treat as raw barcode
    if (!gs1.parsedCodeItems || gs1.parsedCodeItems.length === 0) {
      return { content };
    }

    const gtin = gs1?.parsedCodeItems?.find(item => item.ai === '01')
      ?.data as string;
    const batch = gs1?.parsedCodeItems?.find(item => item.ai === '10')
      ?.data as string;
    const expiryString = gs1?.parsedCodeItems?.find(item => item.ai === '17')
      ?.data as Date;
    const manufactureDateString = gs1?.parsedCodeItems?.find(
      (item: { ai: string }) => item.ai === '11'
    )?.data as Date;
    const quantity =
      Number(
        gs1?.parsedCodeItems?.find((item: { ai: string }) => item.ai === '30')
          ?.data
      ) || undefined;
    const packSize =
      Number(
        gs1?.parsedCodeItems?.find((item: { ai: string }) => item.ai === '37')
          ?.data
      ) || undefined;

    return {
      content,
      gs1,
      gs1string: gs1?.toString(),
      gtin,
      batch,
      expiryDate: expiryString ? Formatter.naiveDate(expiryString) : undefined,
      manufactureDate: manufactureDateString
        ? Formatter.naiveDate(manufactureDateString)
        : undefined,
      quantity,
      packSize,
    };
  } catch (e) {
    console.error(`Error parsing barcode ${content}:`, e);
    return { content };
  }
};
