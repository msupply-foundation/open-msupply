import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

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
  const details = `${storeName} - ${new Date(
    node.createdDatetime
  ).toLocaleDateString()}${clinician}`;

  return [...byItem.values()].map(group => {
    const first = group[0];
    const units = group.reduce(
      (sum, line) => sum + line.numberOfPacks * line.packSize,
      0
    );
    return {
      itemDetails: `${units} ${first.item.unitName ?? ''} ${first.itemName}`,
      itemDirections: group.find(line => line.note)?.note ?? '',
      warning: '',
      patientDetails,
      details,
    };
  });
};
