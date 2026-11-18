import { roundedText } from '../../../intl/numberDisplay';
import { round9 } from '../../../domain/allocation/units';

/** A dispensing record's line, as the list reads it. */
export interface GivenLine {
  type: string;
  itemName: string;
  packSize: number;
  numberOfPacks: number;
}

// The medicines a dispensing record gives, for the Dispensing records list in
// a store that dispenses on the Simple screen (spec/prescriptions rules ›
// Dispensing records): each medicine once, with the amount given in its unit,
// in the order the record lists them — "Paracetamol 500mg (20), ORS sachet
// (2)". Only stock leaving counts: a placeholder awaiting stock gives nothing,
// and a service isn't a medicine.
export const medicinesGiven = (lines: readonly GivenLine[]): string => {
  const units = new Map<string, number>();
  for (const line of lines) {
    if (line.type !== 'STOCK_OUT') continue;
    const given = line.numberOfPacks * line.packSize;
    if (given <= 0) continue;
    units.set(line.itemName, round9((units.get(line.itemName) ?? 0) + given));
  }
  return [...units]
    .map(([name, amount]) => `${name} (${roundedText(amount)})`)
    .join(', ');
};
