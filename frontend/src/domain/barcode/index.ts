// Barcode scanning above the hardware layer (src/platform/barcodeScanner.ts):
//  - reading (spec/barcode-scanning/rules.md § Reading a scan) — what a scan
//    SAYS;
//  - barcodes (§ Looking a barcode up, § Mappings) — which items a barcode
//    is mapped to, and the chooser when it is mapped to several;
//  - the scan affordances (§ Triggering a scan) — a ScanControl and the
//    status / buttons that render it;
//  - issuing by scanning (§ Issuing by scanning) — resolving a scan for a
//    line editor, and the screen-side host shared by the outbound shipment
//    and the dispensing record.

export {
  isBatchLabel,
  itemNumber,
  labelFields,
  readScan,
  readText,
  sameBarcode,
  scanCode,
  type ReadScan,
} from './readScan';
export { DATE_AIS, gs1Date, isRetailGtin } from './gs1';
export { scanCharacters, scanText } from './scanText';
export {
  addBarcode,
  confirmProposal,
  lookUpBarcode,
  proposeBarcode,
  removeBarcode,
  resolveMappings,
  withdrawProposal,
  type BarcodeChange,
  type BarcodeFragment,
  type BarcodeLookup,
  type BarcodeTarget,
  type ProposeInput,
} from './barcodeRegistry';
export {
  createBarcodeChooser,
  type BarcodeChoice,
  type BarcodeChooser,
} from './createBarcodeChooser';
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
  ScanStatus,
  scanStatusShown,
  scanFieldHelper,
  scanUnusableReason,
} from './ScanButton';
export { barcodeFieldFill } from './barcodeField';
export { ScanNarrowedNotice } from './ScanNarrowedNotice';
export {
  proposeIssuedBarcode,
  resolveIssueScan,
  scanExclusions,
  type IssueScan,
  type IssueScanItem,
} from './issueScan';
export {
  createIssueScanHost,
  type IssueScanHost,
  type IssueScanReceiver,
  type BatchLabelReceiver,
} from './createIssueScanHost';
