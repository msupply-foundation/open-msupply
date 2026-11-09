import type { StoreContextResult } from '../../../store/storeContext.generated';
import type { SimpleDispensingItemsResult } from './simpleDispensing.generated';

/** One of the store's common medicines, as the preference holds it. */
export type CommonMedicine =
  StoreContextResult['preferences']['commonMedicines'][number];

type ItemsResult = Extract<
  SimpleDispensingItemsResult['items'],
  { __typename: 'ItemConnector' }
>;
/** A common medicine's item, as the Simple screen fetches it. */
export type CardItem = ItemsResult['nodes'][number];

/** One card on the Simple screen. */
export interface MedicineCard {
  medicine: CommonMedicine;
  item: CardItem;
  /** Units available to dispense now, across every available batch. */
  available: number;
}

/**
 * Whether a card's stock is worth stopping for (spec/prescriptions › the
 * Simple screen): `out` with none available, `low` with less than twice the
 * largest usual amount, `plenty` otherwise — when the card shows no stock line.
 */
export type StockState = 'plenty' | 'low' | 'out';

/** Units available across the item's available batches. */
export const availableUnits = (item: CardItem): number =>
  item.availableBatches.nodes.reduce(
    (sum, batch) => sum + batch.availableNumberOfPacks * batch.packSize,
    0
  );

export const stockState = (
  available: number,
  amounts: number[]
): StockState => {
  if (available <= 0) return 'out';
  // A medicine with no usual amounts is low below 2 units, as if its largest
  // amount were 1.
  const largest = Math.max(1, ...amounts);
  return available < largest * 2 ? 'low' : 'plenty';
};

/**
 * The cards, in the store's order. A common medicine whose item didn't come
 * back — the store can no longer dispense it — gets no card.
 */
export const buildCards = (
  medicines: CommonMedicine[],
  items: CardItem[]
): MedicineCard[] => {
  const byId = new Map(items.map(item => [item.id, item]));
  return medicines.flatMap(medicine => {
    const item = byId.get(medicine.itemId);
    return item ? [{ medicine, item, available: availableUnits(item) }] : [];
  });
};
