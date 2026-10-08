// Barcode scanning above the hardware layer (src/platform/barcodeScanner.ts):
//  - reading (spec/barcode-scanning/rules.md § Reading a scan) — what a scan
//    SAYS;
//  - the registry (§ Looking a code up, § The book's key) — what a code MEANS;
//  - the scan affordances (§ Triggering a scan) — a ScanControl and the two
//    buttons that render it.

export {
  itemNumber,
  labelFields,
  readScan,
  readText,
  scanCode,
  type ReadScan,
} from './readScan';
export { DATE_AIS, gs1Date } from './gs1';
export { scanCharacters, scanText } from './scanText';
export {
  lookUpBarcode,
  saveBarcode,
  type BarcodeLookup,
} from './barcodeRegistry';
export {
  createScanControl,
  shownScanNotice,
  type ScanControl,
  type ScanNoticeShown,
} from './createScanControl';
export {
  ScanButton,
  ScanFieldButton,
  ScanNotice,
  scanUnusableReason,
} from './ScanButton';
export { barcodeFieldFill } from './barcodeField';
