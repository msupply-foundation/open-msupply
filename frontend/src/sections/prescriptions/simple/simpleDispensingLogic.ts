import {
  autoAllocateBarReasons,
  barReasons,
  distributeIssue,
  fillOrderCompare,
  type AllocationPreferences,
} from '@/domain/allocation';
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

/** A batch dispensing may take on its own, with what it has available. */
export interface FillableBatch {
  id: string;
  packSize: number;
  availablePacks: number;
  sellPricePerPack: number;
}

/** One card on the Simple screen. */
export interface MedicineCard {
  medicine: CommonMedicine;
  item: CardItem;
  /** The batches dispensing may take on its own, in fill order. */
  batches: FillableBatch[];
  /** Units in those batches: what the card offers before the list. */
  stock: number;
}

/**
 * Whether a card's stock is worth stopping for (spec/prescriptions › the
 * Simple screen): `out` with none available, `low` with less than twice the
 * largest usual amount, `plenty` otherwise — when the card shows no stock line.
 */
export type StockState = 'plenty' | 'low' | 'out';

/**
 * The item's batches that dispensing may take on its own, in fill order
 * (spec/prescriptions rules › the Simple screen): on-hold stock is hidden from
 * dispensing, and a batch barred from issue or from automatic allocation
 * (expired, unusable VVM…) is never taken by a press. Fill order is first
 * expiry first, or VVM then expiry under its preference — the line editor's
 * own policy (domain/allocation), so the two screens choose the same stock.
 */
export const fillableBatches = (
  item: CardItem,
  prefs: AllocationPreferences,
  today: Date = new Date()
): FillableBatch[] =>
  item.availableBatches.nodes
    .map(batch => ({ ...batch, stockLineOnHold: batch.onHold }))
    .filter(
      batch =>
        batch.availableNumberOfPacks > 0 &&
        !batch.stockLineOnHold &&
        !(batch.location?.onHold ?? false) &&
        barReasons(batch, prefs, today).length === 0 &&
        autoAllocateBarReasons(batch, prefs, today).length === 0
    )
    .sort((a, b) => fillOrderCompare(a, b, prefs))
    .map(batch => ({
      id: batch.id,
      packSize: batch.packSize,
      availablePacks: batch.availableNumberOfPacks,
      sellPricePerPack: batch.sellPricePerPack,
    }));

/** Units across batches. */
export const unitsIn = (batches: readonly FillableBatch[]): number =>
  batches.reduce(
    (sum, batch) => sum + batch.availablePacks * batch.packSize,
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
  items: CardItem[],
  prefs: AllocationPreferences,
  today: Date = new Date()
): MedicineCard[] => {
  const byId = new Map(items.map(item => [item.id, item]));
  return medicines.flatMap(medicine => {
    const item = byId.get(medicine.itemId);
    if (!item) return [];
    const batches = fillableBatches(item, prefs, today);
    return [{ medicine, item, batches, stock: unitsIn(batches) }];
  });
};

/**
 * Packs per batch for a number of units, taken the way dispensing takes them:
 * in fill order, splitting packs (dispensing works in units — the
 * prescriptions variant of the shared distribution).
 */
export const allocate = (
  batches: readonly FillableBatch[],
  units: number
): Map<string, number> =>
  distributeIssue(
    batches.map(batch => ({ ...batch, barred: [] })),
    units,
    { partialPacks: true }
  ).packsById;

/**
 * What those units cost: each batch's packs at that batch's sell price
 * (spec/prescriptions rules › who it's for and the list).
 */
export const priceOf = (
  batches: readonly FillableBatch[],
  units: number
): number => {
  const packs = allocate(batches, units);
  return batches.reduce(
    (sum, batch) => sum + (packs.get(batch.id) ?? 0) * batch.sellPricePerPack,
    0
  );
};

/** One medicine on the list: its total, in the medicine's unit. */
export interface ListLine {
  itemId: string;
  units: number;
}

/** What the list holds of a medicine. */
export const unitsListed = (
  lines: readonly ListLine[],
  itemId: string
): number => lines.find(line => line.itemId === itemId)?.units ?? 0;

/**
 * A press: the amount joins the medicine's line, or starts one. A press that
 * would take the list past what the card has leaves the list as it was, so
 * the list never holds more than can be given out.
 */
export const addAmount = (
  lines: readonly ListLine[],
  itemId: string,
  amount: number,
  stock: number
): ListLine[] => {
  const listed = unitsListed(lines, itemId);
  if (amount <= 0 || listed + amount > stock) return [...lines];
  return listed > 0
    ? lines.map(line =>
        line.itemId === itemId ? { ...line, units: line.units + amount } : line
      )
    : [...lines, { itemId, units: amount }];
};

/**
 * A line's amount entered: brought down to what the card has; zero or no
 * amount leaves the line as it was (spec/prescriptions rules › who it's for
 * and the list).
 */
export const setAmount = (
  lines: readonly ListLine[],
  itemId: string,
  units: number | undefined,
  stock: number
): ListLine[] => {
  if (units == null || units <= 0) return [...lines];
  const capped = Math.min(units, stock);
  return lines.map(line =>
    line.itemId === itemId ? { ...line, units: capped } : line
  );
};

export const removeLine = (
  lines: readonly ListLine[],
  itemId: string
): ListLine[] => lines.filter(line => line.itemId !== itemId);
