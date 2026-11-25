import { round9 } from '@/domain/allocation';
import { itemsGiven } from '../list/medicinesGiven';
import type { DispensedRecord, RecordRead } from './dispensedVisit';
import type { SimpleSaveChangesResult } from './dispensedVisit.generated';
import {
  allocate,
  linePrice,
  repricedLines,
  shortLines,
  stockAtCheck,
  type CardItem,
  type DispenseOutcome,
  type ListLine,
  type MedicineCard,
  type SaveReply,
} from './simpleDispensingLogic';

// Editing a dispensed visit on the Simple screen (spec/prescriptions rules ›
// editing a dispensed visit): its medicines back on the list, its own stock
// counting as available, and Save changes saving the difference to the same
// record.

/** A line of the record, as the Simple screen reads it. */
export type RecordLine = DispensedRecord['lines']['nodes'][number];

type ItemBatch = CardItem['availableBatches']['nodes'][number];

/** The visit being edited, kept with the visit in progress. */
export interface EditedVisit {
  id: string;
  /** When it was dispensed, as the open visit says it. */
  dispensedAt: string;
  /** Who it was for, as the open visit says it (with their code). */
  forName: string | undefined;
  /** Their name alone, for the message once the changes are saved. */
  patientName: string | undefined;
  /** Whether it was for the store's unnamed patient. */
  unnamed: boolean;
  /**
   * The record's lines as last read: the stock the visit holds. Read again
   * by each Save changes.
   */
  lines: RecordLine[];
  /**
   * The id of the line Save changes makes for a batch new to the visit, made
   * once per batch and kept for the edit: a save repeated after a lost reply
   * is refused as a line that exists, rather than taking the stock twice.
   */
  newLineIds: Record<string, string>;
}

/** The visit's medicines as the list holds them: each once, with its amount. */
export const visitListLines = (lines: readonly RecordLine[]): ListLine[] =>
  itemsGiven(lines).map(given => ({
    itemId: given.itemId,
    units: given.amount,
  }));

/** The visit's stock-taking lines, by the batch they took from. */
const ownByBatch = (
  lines: readonly RecordLine[]
): Map<string, RecordLine[]> => {
  const byBatch = new Map<string, RecordLine[]>();
  for (const line of lines) {
    if (line.type !== 'STOCK_OUT' || !line.stockLine) continue;
    const batchId = line.stockLine.id;
    byBatch.set(batchId, [...(byBatch.get(batchId) ?? []), line]);
  }
  return byBatch;
};

/**
 * The items as they stand while the visit is edited: each batch the visit
 * took offers back what the visit took, at the price the visit was charged
 * for it (an updated line keeps its price). A batch the visit emptied, which
 * the items read no longer returns, comes from the visit's own line. Items
 * the visit took nothing of are returned as they are.
 *
 * An item on the default price list is then priced batch by batch, as the
 * server prices the save: the visit's own batches at what they were charged,
 * any other batch at today's default price (a new line's price). Priced at
 * today's default throughout, an edit after the price list changed would
 * show one total and save another.
 */
export const withOwnStock = (
  items: readonly CardItem[],
  lines: readonly RecordLine[]
): CardItem[] => {
  const own = ownByBatch(lines);
  if (own.size === 0) return [...items];
  return items.map(item => {
    const mine = [...own.values()].filter(
      batchLines => batchLines[0]?.itemId === item.id
    );
    if (mine.length === 0) return item;
    const shown = new Set(item.availableBatches.nodes.map(batch => batch.id));
    const defaultPrice = item.defaultPricePerUnit ?? null;
    // A batch the visit didn't take: a new line, at today's default price
    // where the item has one.
    const other = (batch: ItemBatch): ItemBatch =>
      defaultPrice === null
        ? batch
        : { ...batch, sellPricePerPack: defaultPrice * batch.packSize };
    const add = (batch: ItemBatch, batchLines: RecordLine[]): ItemBatch => ({
      ...batch,
      availableNumberOfPacks: round9(
        batch.availableNumberOfPacks +
          batchLines.reduce((sum, line) => sum + line.numberOfPacks, 0)
      ),
      sellPricePerPack:
        batchLines[0]?.sellPricePerPack ?? batch.sellPricePerPack,
    });
    const nodes = [
      ...item.availableBatches.nodes.map(batch => {
        const batchLines = own.get(batch.id);
        return batchLines ? add(batch, batchLines) : other(batch);
      }),
      ...mine.flatMap(batchLines => {
        const batch = batchLines[0]?.stockLine;
        return batch && !shown.has(batch.id) ? [add(batch, batchLines)] : [];
      }),
    ];
    return {
      ...item,
      // Priced from the batches, which now carry the prices the save will.
      defaultPricePerUnit: null,
      availableBatches: { ...item.availableBatches, nodes },
    };
  });
};

/**
 * The line changes Save changes sends (contract › editing a dispensed visit):
 * per batch, from the new allocation and the record's lines. A batch the
 * visit already took keeps its line, given the new amount; a second line on
 * the same batch gets what is left. A new batch gets a new line; a batch no
 * longer taken has its lines deleted. Lines that take no stock are left
 * alone. The server inserts, then updates, then deletes, so no insert relies
 * on stock a delete frees.
 */
export const editInput = (
  recordId: string,
  lines: readonly RecordLine[],
  listed: readonly ListLine[],
  cards: readonly MedicineCard[],
  lineIdFor: (batchId: string) => string
) => {
  const target = new Map<string, number>();
  for (const line of listed) {
    const card = cards.find(c => c.item.id === line.itemId);
    if (!card) continue;
    for (const [batchId, packs] of allocate(card.batches, line.units))
      if (packs > 0) target.set(batchId, round9(packs));
  }
  const own = ownByBatch(lines);
  const insertPrescriptionLines: {
    id: string;
    invoiceId: string;
    stockLineId: string;
    numberOfPacks: number;
  }[] = [];
  const updatePrescriptionLines: { id: string; numberOfPacks: number }[] = [];
  const deletePrescriptionLines: { id: string }[] = [];
  for (const batchId of new Set([...target.keys(), ...own.keys()])) {
    const packs = target.get(batchId) ?? 0;
    const batchLines = own.get(batchId) ?? [];
    if (batchLines.length === 0) {
      insertPrescriptionLines.push({
        id: lineIdFor(batchId),
        invoiceId: recordId,
        stockLineId: batchId,
        numberOfPacks: packs,
      });
      continue;
    }
    let left = packs;
    batchLines.forEach((line, index) => {
      const last = index === batchLines.length - 1;
      const given = last ? left : Math.min(left, line.numberOfPacks);
      left = round9(left - given);
      if (given <= 0) deletePrescriptionLines.push({ id: line.id });
      else if (given !== line.numberOfPacks)
        updatePrescriptionLines.push({ id: line.id, numberOfPacks: given });
    });
  }
  return {
    insertPrescriptionLines,
    updatePrescriptionLines,
    deletePrescriptionLines,
    continueOnError: false,
  };
};

export type EditInput = ReturnType<typeof editInput>;

/** Whether a save would change nothing. */
export const changesNothing = (input: EditInput): boolean =>
  input.insertPrescriptionLines.length === 0 &&
  input.updatePrescriptionLines.length === 0 &&
  input.deletePrescriptionLines.length === 0;

/**
 * What a Save changes did: `saved` when every change came back saved,
 * `line-refused` when a batch refused its line (the stock moved since the
 * check), `refused` otherwise. One transaction, so a refusal saved nothing.
 */
export const editOutcome = (
  result: SimpleSaveChangesResult['batchPrescription'],
  input: EditInput
): DispenseOutcome => {
  const inserted = result.insertPrescriptionLines ?? [];
  const updated = result.updatePrescriptionLines ?? [];
  const deleted = result.deletePrescriptionLines ?? [];
  if (
    inserted.some(
      line => line.response.__typename === 'InsertPrescriptionLineError'
    ) ||
    updated.some(
      line => line.response.__typename === 'UpdatePrescriptionLineError'
    )
  )
    return 'line-refused';
  const saved =
    inserted.length === input.insertPrescriptionLines.length &&
    inserted.every(line => line.response.__typename === 'InvoiceLineNode') &&
    updated.length === input.updatePrescriptionLines.length &&
    updated.every(line => line.response.__typename === 'InvoiceLineNode') &&
    deleted.length === input.deletePrescriptionLines.length &&
    deleted.every(line => line.response.__typename === 'DeleteResponse');
  return saved ? 'saved' : 'refused';
};

/**
 * Whether the record gives what the list holds: each medicine, with the same
 * amount. After a lost reply or a refusal, it says the changes were saved.
 */
export const givesListed = (
  lines: readonly RecordLine[],
  listed: readonly ListLine[]
): boolean => {
  const given = visitListLines(lines);
  return (
    given.length === listed.length &&
    listed.every(line => {
      const now = given.find(g => g.itemId === line.itemId);
      return now !== undefined && round9(now.units) === round9(line.units);
    })
  );
};

export type { RecordRead };

/**
 * What a Delete whose reply was lost did, by the record read after it
 * (rules › editing a dispensed visit): gone is deleted; past Picked, it can't
 * be edited any more; still Picked, it wasn't deleted. A read that failed
 * (undefined) can't tell.
 */
export const afterDeleteRead = (
  read: RecordRead | undefined
): 'deleted' | 'not-editable' | 'not-deleted' | 'unknown' => {
  if (read === undefined) return 'unknown';
  if (read.kind === 'gone') return 'deleted';
  return read.record.status === 'PICKED' ? 'not-deleted' : 'not-editable';
};

/**
 * The calls Save changes makes, so its steps can be followed without a server.
 */
export interface EditCalls {
  /** The record now; undefined when it couldn't be read. */
  read: (id: string) => Promise<RecordRead | undefined>;
  /**
   * The list's medicines as the stock stands now, the record's own lines
   * counting as available; undefined when they couldn't be read.
   */
  check: (
    listed: readonly ListLine[],
    lines: readonly RecordLine[]
  ) => Promise<MedicineCard[] | undefined>;
  save: (input: EditInput) => Promise<SaveReply>;
  /** The list's medicines as the screen knew them. */
  before: (itemId: string) => MedicineCard | undefined;
  lineIdFor: (batchId: string) => string;
  /** The currency's smallest unit, as decimal places. Two when not given. */
  priceDecimals?: number;
}

/**
 * How Save changes ended:
 * - `saved`: the record gives what the list holds, now or by an earlier save
 *   (or nothing needed saving);
 * - `stopped`: nothing saved; a line is short or its price changed;
 * - `not-editable`: nothing saved; the record is no longer Picked, or gone;
 * - `failed`: nothing saved; `lines` is the record as read, when it was;
 * - `unsure`: the reply was lost, and the record couldn't tell.
 */
export type EditEnd =
  | { kind: 'saved' }
  | {
      kind: 'stopped';
      checked: MedicineCard[];
      repriced: string[];
      lines: RecordLine[];
    }
  | { kind: 'not-editable' }
  | {
      kind: 'failed';
      checked?: MedicineCard[];
      lines?: RecordLine[];
      missing?: string[];
    }
  | { kind: 'unsure' };

const editable = (
  read: RecordRead
): read is { kind: 'read'; record: DispensedRecord } =>
  read.kind === 'read' && read.record.status === 'PICKED';

/**
 * Save changes (rules › editing a dispensed visit): read the record, check
 * the list against the stock with the record's own counting as available,
 * and save the difference if it is all there at the prices shown. After a
 * lost reply or a refusal, the record read again says whether the changes
 * are saved; a line refused because the stock moved is checked and tried
 * once more.
 */
export const saveChanges = async (
  id: string,
  listed: readonly ListLine[],
  calls: EditCalls,
  retried = false
): Promise<EditEnd> => {
  const shown = new Map<string, number>();
  for (const line of listed) {
    const card = calls.before(line.itemId);
    if (card) shown.set(line.itemId, linePrice(card, line.units));
  }
  const read = await calls.read(id);
  if (!read) return { kind: 'failed' };
  if (!editable(read)) return { kind: 'not-editable' };
  const lines = read.record.lines.nodes;
  const fresh = await calls.check(listed, lines);
  if (!fresh) return { kind: 'failed', lines };
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
    return { kind: 'stopped', checked, repriced, lines };
  const input = editInput(id, lines, listed, fresh, calls.lineIdFor);
  if (changesNothing(input)) return { kind: 'saved' };
  const reply = await calls.save(input);
  if (reply.kind === 'reply' && reply.outcome === 'saved')
    return { kind: 'saved' };
  const after = await calls.read(id);
  if (after?.kind === 'read' && givesListed(after.record.lines.nodes, listed))
    return { kind: 'saved' };
  if (after && !editable(after)) return { kind: 'not-editable' };
  if (reply.kind === 'lost') return { kind: 'unsure' };
  if (reply.outcome === 'line-refused' && !retried)
    return saveChanges(id, listed, calls, true);
  return {
    kind: 'failed',
    checked,
    lines: after?.kind === 'read' ? after.record.lines.nodes : lines,
    missing: reply.missing,
  };
};
