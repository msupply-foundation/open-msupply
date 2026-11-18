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
  /**
   * The item's default price list price per unit, which every unit of its
   * line costs; null when it is on none, and its batches set the price.
   */
  defaultPricePerUnit: number | null;
  /** The batches dispensing may take on its own, in fill order. */
  batches: FillableBatch[];
  /** Units in those batches: what the card offers before the list. */
  stock: number;
}

/**
 * Whether a card's stock is worth stopping for (spec/prescriptions › the
 * Simple screen): `out` with none available, `low` with less than twice the
 * largest usual amount, `plenty` otherwise.
 */
export type StockState = 'plenty' | 'low' | 'out';

/**
 * What a card says about its stock (rules › the Simple screen): how much is
 * `left`, or the `low` / `out` warning. On a phone only the warnings show, and
 * a card with neither says nothing (undefined) — it shows its unit alone.
 */
export type StockLine = 'left' | 'low' | 'out' | undefined;

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

export const stockLine = (
  available: number,
  amounts: number[],
  phone: boolean
): StockLine => {
  const state = stockState(available, amounts);
  if (state !== 'plenty') return state;
  return phone ? undefined : 'left';
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
    return [
      {
        medicine,
        item,
        defaultPricePerUnit: item.defaultPricePerUnit ?? null,
        batches,
        stock: unitsIn(batches),
      },
    ];
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
 * The medicines from the search that a failed read leaves unread: those the
 * last read that went through didn't return (rules › another amount, and
 * other medicines). They are dropped, so choosing one again reads it again;
 * the others keep what that read returned, so their lines don't change.
 */
export const unreadIds = (
  itemIds: readonly string[],
  lastRead: readonly { id: string }[] | undefined
): string[] => {
  const read = new Set(lastRead?.map(item => item.id));
  return itemIds.filter(itemId => !read.has(itemId));
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
 * What those units cost, as the saved record charges them (spec/prescriptions
 * rules › who it's for and the list). An item on the default price list costs
 * its default price for every unit, whichever batches are taken: the server
 * prices each pack at that price × its pack size. Otherwise each batch's packs
 * cost that batch's sell price. Units beyond what the batches hold — a line
 * left short when Dispense found less stock — cost the last batch's price per
 * unit, so the line and the total don't drop while the line still holds them.
 */
export const priceOf = (
  batches: readonly FillableBatch[],
  units: number,
  defaultPricePerUnit: number | null = null
): number => {
  if (defaultPricePerUnit !== null) return units * defaultPricePerUnit;
  const packs = allocate(batches, units);
  let covered = 0;
  let price = 0;
  for (const batch of batches) {
    const taken = packs.get(batch.id) ?? 0;
    covered += taken * batch.packSize;
    price += taken * batch.sellPricePerPack;
  }
  const last = batches[batches.length - 1];
  const beyond = units - covered;
  return last && beyond > 0
    ? price + (beyond * last.sellPricePerPack) / last.packSize
    : price;
};

/** A line's price on a card: zero with no card to price it from. */
export const linePrice = (
  card: MedicineCard | undefined,
  units: number
): number =>
  card ? priceOf(card.batches, units, card.defaultPricePerUnit) : 0;

/**
 * Whether two prices read differently to the currency's smallest unit
 * (`decimals` places): a difference rounding alone makes doesn't count
 * (spec/prescriptions rules › dispensing the visit).
 */
export const priceDiffers = (
  shown: number,
  now: number,
  decimals: number
): boolean => {
  const scale = 10 ** decimals;
  return Math.round(round9(shown * scale)) !== Math.round(round9(now * scale));
};

/** One medicine on the list: its total, in the medicine's unit. */
export interface ListLine {
  itemId: string;
  units: number;
  /**
   * The amount last typed was above the stock and stopped there, so the line
   * says how much the system shows (rules › who it's for and the list). Gone
   * once the amount changes again.
   */
  capped?: true;
  /**
   * Dispense stopped because the line's price changed since it was added, so
   * the line says what it is now (rules › dispensing the visit). Gone once
   * the amount changes or Dispense is pressed again.
   */
  repriced?: true;
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
        line.itemId === itemId ? { itemId, units: total } : line
      )
    : [...lines, { itemId, units: amount }];
};

/**
 * A line's amount entered (spec/prescriptions rules › who it's for and the
 * list): above the stock, it stops at the stock and the line is marked so it
 * can say why; zero or no amount leaves the line as it was, and so does any
 * amount for a medicine with none left, which can only be removed.
 */
export const setAmount = (
  lines: readonly ListLine[],
  itemId: string,
  units: number | undefined,
  stock: number
): ListLine[] => {
  if (units == null || units <= 0 || stock <= 0) return [...lines];
  const next: ListLine =
    units > stock ? { itemId, units: stock, capped: true } : { itemId, units };
  return lines.map(line => (line.itemId === itemId ? next : line));
};

/**
 * Whether the amount box can add a typed amount (rules › another amount, and
 * other medicines): something above zero, and no more than what's available.
 */
export const canAddTyped = (
  units: number | undefined,
  available: number
): boolean => units !== undefined && units > 0 && units <= available;

/**
 * Why the amount box can't add more (rules › another amount, and other
 * medicines): the stock the system shows before the list, what the list holds
 * of it (`selected`), and what can still be added (`upTo`).
 */
export const amountLimit = (
  stock: number,
  available: number
): { stock: number; selected: number; upTo: number } => ({
  stock,
  selected: round9(stock - available),
  upTo: available,
});

export const removeLine = (
  lines: readonly ListLine[],
  itemId: string
): ListLine[] => lines.filter(line => line.itemId !== itemId);

/**
 * The list's medicines as Dispense's check found them (spec/prescriptions
 * rules › dispensing the visit): the freshly read card, or — for a medicine
 * the read no longer returns, which the store can no longer dispense — its
 * card as it was, with nothing available.
 */
export const stockAtCheck = (
  listed: readonly ListLine[],
  fresh: readonly MedicineCard[],
  before: (itemId: string) => MedicineCard | undefined
): MedicineCard[] =>
  listed.flatMap(line => {
    const now = fresh.find(card => card.item.id === line.itemId);
    if (now) return [now];
    const was = before(line.itemId);
    return was ? [{ ...was, batches: [], stock: 0 }] : [];
  });

/**
 * The lines holding more than the stock the screen now knows of, in list
 * order (spec/prescriptions rules › dispensing the visit). Never changed here:
 * staff choose what to do about each.
 */
export const shortLines = (
  lines: readonly ListLine[],
  stockOf: (itemId: string) => number
): ListLine[] => lines.filter(line => line.units > stockOf(line.itemId));

/**
 * The lines whose price at Dispense's check differs from the price the screen
 * showed (spec/prescriptions rules › dispensing the visit), in list order.
 * `shown` is each line's price before the check, by item id; a line with none
 * can't be compared. A short line is left out: its short warning takes
 * precedence, and its price follows once its amount changes.
 */
export const repricedLines = (
  lines: readonly ListLine[],
  shown: ReadonlyMap<string, number>,
  checked: readonly MedicineCard[],
  decimals: number
): ListLine[] =>
  lines.filter(line => {
    const was = shown.get(line.itemId);
    const now = checked.find(card => card.item.id === line.itemId);
    if (was === undefined || !now || line.units > now.stock) return false;
    return priceDiffers(was, linePrice(now, line.units), decimals);
  });

/**
 * The batch save for a visit: the record, one line per batch taken (packs
 * split where needed, in allocation order), and the move to Picked.
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

/** The batch save for a visit, as `dispenseInput` builds it. */
export type DispenseInput = ReturnType<typeof dispenseInput>;

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
  // A save with no lines dispenses nothing, whatever came back.
  if (expectedLines <= 0) return 'refused';
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
): boolean => invoice.__typename === 'InvoiceNode' && invoice.status !== 'NEW';

/**
 * The visit's record while it is being dispensed (rules › dispensing the
 * visit): its id, made once and kept until the visit is finished or the list
 * cleared, so a repeated save can't make a second record. `sentFor` is set
 * once a save went without a definite reply: that save may land at any
 * moment until the visit is finished, so it stays set until then, naming who
 * it was saved for.
 */
export interface VisitRecord {
  id: string;
  sentFor?: { id: string; name: string };
}

/** What became of a save, as far as the screen can tell. */
export type SaveReply =
  /** No reply, or none that could be read: it may have gone through. */
  | { kind: 'lost' }
  /** A definite reply: the transaction ran, or was refused whole. */
  | { kind: 'reply'; outcome: DispenseOutcome; missing?: string[] };

/** The calls Dispense makes, so its steps can be followed without a server. */
export interface DispenseCalls {
  /**
   * Whether the visit's record was saved; undefined when the server couldn't
   * be asked.
   */
  look: (id: string) => Promise<boolean | undefined>;
  /**
   * The list's medicines as the stock stands now; undefined when it couldn't
   * be read.
   */
  check: (listed: readonly ListLine[]) => Promise<MedicineCard[] | undefined>;
  save: (input: DispenseInput) => Promise<SaveReply>;
  /**
   * The list's medicines as the screen knew them, for one the check no longer
   * returns.
   */
  before: (itemId: string) => MedicineCard | undefined;
  newId: () => string;
  /**
   * The currency's smallest unit, as decimal places: prices are compared to
   * it. Two when not given.
   */
  priceDecimals?: number;
}

/**
 * How Dispense ended (rules › dispensing the visit):
 * - `saved`: the visit is saved, now or by an earlier save, for `patient`;
 * - `stopped`: nothing saved; `checked` is the stock now, with a line short
 *   or a line's price changed — `repriced` names those, by item id;
 * - `failed`: nothing saved; `checked` is the stock now when it was read,
 *   and `missing` the permissions a refusal named;
 * - `unsure`: a save may have gone through and the screen can't tell.
 */
export type DispenseEnd =
  | { kind: 'saved'; patient: { id: string; name: string } }
  | { kind: 'stopped'; checked: MedicineCard[]; repriced: string[] }
  | { kind: 'failed'; checked?: MedicineCard[]; missing?: string[] }
  | { kind: 'unsure' };

/**
 * Whether an earlier save of the visit went through, when one may have:
 * `saved` or `unsure` end Dispense; undefined carries on.
 */
const lookFirst = async (
  visit: VisitRecord | undefined,
  calls: DispenseCalls
): Promise<DispenseEnd | undefined> => {
  if (!visit?.sentFor) return undefined;
  const saved = await calls.look(visit.id);
  if (saved === undefined) return { kind: 'unsure' };
  return saved ? { kind: 'saved', patient: visit.sentFor } : undefined;
};

/**
 * Dispense (rules › dispensing the visit): check the list against the stock
 * now and save it if it is all there, at the prices the screen showed. While
 * an earlier save may have gone through, every way out but a save looks for
 * it first, so a visit saved by a reply that was lost is finished, never
 * saved again, and never reported as short, repriced or failed. `visit` is
 * updated in place: its id is made on the first save, and `sentFor` set by a
 * save whose reply is lost.
 */
export const dispenseVisit = async (
  visit: { current?: VisitRecord },
  patient: { id: string; name: string },
  listed: readonly ListLine[],
  calls: DispenseCalls,
  retried = false
): Promise<DispenseEnd> => {
  // Each line's price as the screen shows it, before the check replaces the
  // stock it is priced from.
  const shown = new Map<string, number>();
  for (const line of listed) {
    const card = calls.before(line.itemId);
    if (card) shown.set(line.itemId, linePrice(card, line.units));
  }
  const earlier = await lookFirst(visit.current, calls);
  if (earlier) return earlier;
  const fresh = await calls.check(listed);
  if (!fresh)
    return (await lookFirst(visit.current, calls)) ?? { kind: 'failed' };
  const checked = stockAtCheck(listed, fresh, calls.before);
  const stockNow = (itemId: string) =>
    checked.find(card => card.item.id === itemId)?.stock ?? 0;
  const repriced = repricedLines(
    listed,
    shown,
    checked,
    calls.priceDecimals ?? 2
  ).map(line => line.itemId);
  if (shortLines(listed, stockNow).length > 0 || repriced.length > 0)
    return (
      (await lookFirst(visit.current, calls)) ?? {
        kind: 'stopped',
        checked,
        repriced,
      }
    );
  const record = (visit.current ??= { id: calls.newId() });
  const input = dispenseInput(
    record.id,
    patient.id,
    listed,
    fresh,
    calls.newId
  );
  if (input.insertPrescriptionLines.length === 0)
    return { kind: 'failed', checked };
  const reply = await calls.save(input);
  if (reply.kind === 'lost') {
    record.sentFor ??= patient;
    const saved = await calls.look(record.id);
    return saved
      ? { kind: 'saved', patient: record.sentFor }
      : { kind: 'unsure' };
  }
  if (reply.outcome === 'saved') return { kind: 'saved', patient };
  // Refused, so this save rolled back; an earlier one may still have landed,
  // and the refusal may be the server saying the visit is already there.
  const landed = await lookFirst(record, calls);
  if (landed) return landed;
  if (reply.outcome === 'line-refused' && !retried)
    return dispenseVisit(visit, patient, listed, calls, true);
  return { kind: 'failed', checked, missing: reply.missing };
};
