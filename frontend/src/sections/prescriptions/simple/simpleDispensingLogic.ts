import {
  autoAllocateBarReasons,
  barReasons,
  distributeIssue,
  fillOrderCompare,
  round9,
  type AllocationPreferences,
} from '@/domain/allocation';
import type { StoreContextResult } from '../../../store/storeContext.generated';
import type { SimpleDispensingItemsResult } from './simpleDispensing.generated';
import type {
  SimpleDispensedVisitResult,
  SimpleDispenseResult,
} from './simpleDispense.generated';

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

/**
 * Units across batches, without float dust: 0.29 packs of 100 is 29 units,
 * not 28.999999999999996, or a press of 29 would be refused.
 */
export const unitsIn = (batches: readonly FillableBatch[]): number =>
  round9(
    batches.reduce(
      (sum, batch) => sum + batch.availablePacks * batch.packSize,
      0
    )
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
 * The medicines for some item ids: a common medicine keeps its usual amounts,
 * and one chosen from the search has none (rules › another amount, and other
 * medicines). Built into cards that are never shown, so a searched medicine's
 * line is priced, checked and saved like a card's.
 */
export const medicinesFor = (
  itemIds: readonly string[],
  common: readonly CommonMedicine[]
): CommonMedicine[] =>
  itemIds.map(
    itemId =>
      common.find(medicine => medicine.itemId === itemId) ?? {
        itemId,
        amounts: [],
      }
  );

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
  const total = round9(listed + amount);
  if (amount <= 0 || total > stock) return [...lines];
  return listed > 0
    ? lines.map(line =>
        line.itemId === itemId ? { ...line, units: total } : line
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

/**
 * Whether the amount box can add a typed amount (rules › another amount, and
 * other medicines): something above zero, and no more than what's available.
 */
export const canAddTyped = (
  units: number | undefined,
  available: number
): boolean => units !== undefined && units > 0 && units <= available;

export const removeLine = (
  lines: readonly ListLine[],
  itemId: string
): ListLine[] => lines.filter(line => line.itemId !== itemId);

/** A line the stock can no longer give out in full, and what it can. */
export interface Shortfall {
  itemId: string;
  wanted: number;
  available: number;
}

/**
 * The lines the stock can no longer cover, checked against freshly read cards
 * (spec/prescriptions rules › dispensing the visit). A medicine that has no
 * card any more has nothing available.
 */
export const shortfalls = (
  lines: readonly ListLine[],
  fresh: readonly MedicineCard[]
): Shortfall[] =>
  lines.flatMap(line => {
    const available =
      fresh.find(card => card.item.id === line.itemId)?.stock ?? 0;
    return line.units > available
      ? [{ itemId: line.itemId, wanted: line.units, available }]
      : [];
  });

/**
 * The list with each short line brought down to what is available, or removed.
 */
export const reduceToAvailable = (
  lines: readonly ListLine[],
  short: readonly Shortfall[]
): ListLine[] =>
  lines.flatMap(line => {
    const cut = short.find(s => s.itemId === line.itemId);
    if (!cut) return [line];
    return cut.available > 0 ? [{ ...line, units: cut.available }] : [];
  });

/**
 * The batch save for a visit: the record, one line per batch taken (packs
 * split where needed, first expiry first), and the move to Picked.
 */
export const dispenseInput = (
  prescriptionId: string,
  patientId: string,
  lines: readonly ListLine[],
  cards: readonly MedicineCard[],
  newId: () => string
) => ({
  insertPrescriptions: [{ id: prescriptionId, patientId }],
  insertPrescriptionLines: lines.flatMap(line => {
    const card = cards.find(c => c.item.id === line.itemId);
    if (!card) return [];
    const packs = allocate(card.batches, line.units);
    return card.batches.flatMap(batch => {
      const numberOfPacks = packs.get(batch.id) ?? 0;
      return numberOfPacks > 0
        ? [
            {
              id: newId(),
              invoiceId: prescriptionId,
              stockLineId: batch.id,
              numberOfPacks,
            },
          ]
        : [];
    });
  }),
  updatePrescriptions: [{ id: prescriptionId, status: 'PICKED' as const }],
  continueOnError: false,
});

/**
 * What a Dispense save did (rules › dispensing the visit). The save is one
 * transaction, so a refusal anywhere means nothing was saved:
 * - `saved`: the record, every line and the move to Picked all came back
 *   saved;
 * - `line-refused`: a batch refused its line, most likely because the stock
 *   moved since the check, so the list is worth checking again;
 * - `refused`: anything else refused, or a part came back missing.
 */
export type DispenseOutcome = 'saved' | 'line-refused' | 'refused';

export const dispenseOutcome = (
  result: SimpleDispenseResult['batchPrescription'],
  expectedLines: number
): DispenseOutcome => {
  const lines = result.insertPrescriptionLines ?? [];
  if (
    lines.some(
      line => line.response.__typename === 'InsertPrescriptionLineError'
    )
  )
    return 'line-refused';
  const records = result.insertPrescriptions ?? [];
  const updates = result.updatePrescriptions ?? [];
  const saved =
    records.length === 1 &&
    records.every(record => record.response.__typename === 'InvoiceNode') &&
    lines.length === expectedLines &&
    lines.every(line => line.response.__typename === 'InvoiceLineNode') &&
    updates.length === 1 &&
    updates.every(update => update.response.__typename === 'InvoiceNode');
  return saved ? 'saved' : 'refused';
};

/**
 * Whether a visit whose save couldn't be confirmed was saved after all: its
 * record exists past New. The move to Picked is the save's last step, in the
 * same transaction, so a record that reached it holds the whole visit; it may
 * have moved on since (finished, or cancelled), and was still saved.
 */
export const visitWasSaved = (
  invoice: SimpleDispensedVisitResult['invoice']
): boolean =>
  invoice.__typename === 'InvoiceNode' && invoice.status !== 'NEW';
