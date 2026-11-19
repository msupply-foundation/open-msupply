import { roundedText } from '../../../intl/numberDisplay';
import { round9 } from '../../../domain/allocation/units';

/** A dispensing record's line, as the list reads it. */
export interface GivenLine {
  type: string;
  itemId: string;
  itemName: string;
  packSize: number;
  numberOfPacks: number;
}

// The medicines a dispensing record gives, for the Dispensing records list in
// a store that dispenses on the Simple screen (spec/prescriptions rules ›
// Dispensing records): each medicine once, with the amount given in its unit,
// in the order the record screen lists them, by name — "ORS sachet (2),
// Paracetamol 500mg (20)". Only stock leaving counts: a placeholder awaiting
// stock gives nothing, and a service isn't a medicine.
//
// Grouped by item, not name: two items can share a name (a tablet and a
// syrup), and their amounts are in different units. The server returns a
// record's lines in no set order, so the name order is made here, as the
// record screen makes it.
//
// `amountText` writes each amount: the screen's rounded figure by default; a
// file passes its own, so its digits stay Latin and unmarked.
export const medicinesGiven = (
  lines: readonly GivenLine[],
  amountText: (amount: number) => string = roundedText
): string => {
  const given = new Map<string, { name: string; amount: number }>();
  const byName = [...lines].sort((a, b) =>
    a.itemName.localeCompare(b.itemName)
  );
  for (const line of byName) {
    if (line.type !== 'STOCK_OUT') continue;
    const units = line.numberOfPacks * line.packSize;
    if (units <= 0) continue;
    const sofar = given.get(line.itemId);
    given.set(line.itemId, {
      name: line.itemName,
      amount: round9((sofar?.amount ?? 0) + units),
    });
  }
  return [...given.values()]
    .map(({ name, amount }) => `${name} (${amountText(amount)})`)
    .join(', ');
};
