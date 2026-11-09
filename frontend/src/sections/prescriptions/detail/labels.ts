import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';
import { exportDate } from '../../../intl/formatDateTime';
import { formatNumber } from '../../../intl/formatNumber';
import { ROUNDED_MARK, decimalPlaces } from '../../../intl/numberDisplay';

// What a dispensing label says (spec/prescriptions/rules.md § label printing;
// OMS-REG-DIS-03.47): one label per dispensed ITEM — quantity summary +
// directions, patient name and code, store/date/clinician. Delivering it is
// the device's (@/domain/labelPrinter). The payload mirrors the
// reference client's label shape; the item-warning slot is not fetched here
// and prints empty (recorded in the build report).

export interface PrescriptionLabel {
  itemDetails: string;
  itemDirections: string;
  warning: string;
  patientDetails: string;
  details: string;
}

type Line = PrescriptionFieldsFragment['lines']['nodes'][number];

// A label's figures keep Latin digits whatever the app's language: the server
// writes the label as ZPL and blanks any non-ASCII digit (sanitise_fd_field in
// server/service/src/print/label.rs), so an Arabic, Pashto or Dari label
// printed its date and quantity as spaces.
const LATIN = { numberingSystem: 'latn' } as const;

// roundedText, in Latin digits: the configured places, marked when they lost
// something.
const printedQuantity = (units: number): string => {
  const text = formatNumber(units, {
    ...LATIN,
    maximumFractionDigits: decimalPlaces(),
  });
  return text === formatNumber(units, LATIN) ? text : `${text}${ROUNDED_MARK}`;
};

/** Build one label per dispensed item (lines merged, units summed). */
export const buildLabels = (
  node: PrescriptionFieldsFragment,
  storeName: string,
  lines: readonly Line[] = node.lines.nodes
): PrescriptionLabel[] => {
  const byItem = new Map<string, Line[]>();
  for (const line of lines) {
    if (line.type !== 'STOCK_OUT') continue;
    const group = byItem.get(line.itemId);
    if (group) group.push(line);
    else byItem.set(line.itemId, [line]);
  }
  const clinician = node.clinician
    ? ` - ${node.clinician.lastName}, ${node.clinician.firstName}`
    : '';
  const patientDetails = node.patient
    ? `${node.patient.name} - ${node.patient.code}`
    : '';
  // The app's date format, as the side panel shows it — not the runtime's
  // toLocaleDateString, which follows the OS display language (internal #1838)
  // — in Latin digits, as above.
  const details = `${storeName} - ${exportDate(
    node.createdDatetime
  )}${clinician}`;

  return [...byItem.values()].map(group => {
    const first = group[0];
    const units = group.reduce(
      (sum, line) => sum + line.numberOfPacks * line.packSize,
      0
    );
    return {
      itemDetails: `${printedQuantity(units)} ${first.item.unitName ?? ''} ${first.itemName}`,
      itemDirections: group.find(line => line.note)?.note ?? '',
      warning: '',
      patientDetails,
      details,
    };
  });
};
