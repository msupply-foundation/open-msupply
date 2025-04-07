import { PrescriptionLineFragment, PrescriptionRowFragment } from '../../api';

interface ItemDetails {
  id: string;
  unitName: string;
  name: string;
  itemDirections: string;
  warning: string;
  sum: number;
}
interface Label {
  itemDetails: string;
  itemDirections: string;
  warning: string;
  patientDetails: string;
  details: string;
}

export const groupItems = (
  lines: PrescriptionLineFragment[]
): ItemDetails[] => {
  const linesByItem: { [key: string]: PrescriptionLineFragment[] } = {};

  // groups all batches of an item by id
  lines.forEach(line => {
    const { id } = line.item;
    if (!linesByItem[id]) {
      linesByItem[id] = [];
    }
    linesByItem[id].push(line);
  });

  // gets the objects from the items array
  const items = Object.values(linesByItem).map((items): ItemDetails => {
    const firstItem = items[0];
    const itemWithNote = items.find(item => item) || firstItem;

    const priorityWarning =
      items.map(item => item.item.warnings.find(warning => warning.priority)) ||
      items.map(item => item.item.warnings.find(warning => !warning.priority));

    const warning = priorityWarning[0];

    // calculates the number of units prescribed for each item
    const totalUnits = items.reduce(
      (sum, item) => sum + item.numberOfPacks * item.packSize,
      0
    );

    // returns item values required to construct the label
    return {
      id: firstItem?.id ?? '',
      unitName: firstItem?.item.unitName ?? '',
      name: firstItem?.itemName ?? '',
      sum: totalUnits,
      itemDirections: itemWithNote?.note ?? '',
      warning: warning?.warningText ?? '',
    };
  });
  return items;
};

export const generateLabel = (
  results: ItemDetails[],
  prescription: PrescriptionRowFragment,
  store: string
): Label[] => {
  const clinicianDetails = prescription.clinician
    ? ` - ${prescription.clinician.lastName}, ${prescription.clinician.firstName}`
    : '';
  const patientDetails = `${prescription.patient?.name} - ${prescription.patient?.code}`;

  return results.map((result: ItemDetails): Label => {
    const itemDetails = `${result.sum} ${result.unitName} ${result.name}`;

    const finishedLabel = {
      itemDetails: itemDetails,
      itemDirections: result.itemDirections,
      warning: result.warning,
      patientDetails: patientDetails,
      details: `${store} - ${new Date(prescription.createdDatetime).toLocaleDateString()}${clinicianDetails}`,
    };
    return finishedLabel;
  });
};
