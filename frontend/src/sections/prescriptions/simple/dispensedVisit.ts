import { round9 } from '@/domain/allocation';
import type { LocaleKey } from '@/intl';
import {
  asPrescriptionStatus,
  canCancelPrescription,
} from '../prescriptionStatus';
import type { SimpleDispensedRecordResult } from './dispensedVisit.generated';

// A dispensed visit, open on the Simple screen (spec/prescriptions rules › a
// dispensed visit): what the screen says about a record it reads back.

/** The record as the Simple screen reads it. */
export type DispensedRecord = Extract<
  SimpleDispensedRecordResult['invoice'],
  { __typename: 'InvoiceNode' }
>;

type RecordLine = DispensedRecord['lines']['nodes'][number];

/** One medicine (or service) the record gives, as the open visit lists it. */
export interface VisitLine {
  itemId: string;
  name: string;
  unit: string | null;
  /** The amount given in the item's unit; undefined for a service. */
  units: number | undefined;
  /** What the record charges for it. */
  price: number;
}

/**
 * The record's lines as the open visit lists them: each medicine once, its
 * amount (in its unit) and price added up over its batches, by name, as
 * Dispensing records lists them. Lines giving nothing — a placeholder awaiting
 * stock, or a line of none — are left out. A service shows its price and no
 * amount. Grouped by item, not name: two items can share a name, and their
 * amounts are in different units.
 */
export const visitLines = (lines: readonly RecordLine[]): VisitLine[] => {
  const byName = [...lines].sort((a, b) =>
    a.itemName.localeCompare(b.itemName)
  );
  const given = new Map<string, VisitLine>();
  for (const line of byName) {
    const isService = line.type === 'SERVICE';
    const units = line.numberOfPacks * line.packSize;
    if (!isService && (line.type !== 'STOCK_OUT' || units <= 0)) continue;
    const sofar = given.get(line.itemId);
    given.set(line.itemId, {
      itemId: line.itemId,
      name: line.itemName,
      unit: line.item.unitName,
      units: isService ? undefined : round9((sofar?.units ?? 0) + units),
      price: round9((sofar?.price ?? 0) + line.totalAfterTax),
    });
  }
  return [...given.values()];
};

/** When the visit was dispensed: the backdated time, else created. */
export const dispensedAt = (record: DispensedRecord): string =>
  record.backdatedDatetime ?? record.createdDatetime;

/**
 * What the open visit's head says: when it was dispensed; for a cancelled
 * visit, when it was cancelled as well; for a record still New, when it was
 * created.
 */
export type VisitHeading =
  | { kind: 'dispensed'; at: string }
  | { kind: 'cancelled'; at: string; cancelledAt: string }
  | { kind: 'created'; at: string };

export const visitHeading = (record: DispensedRecord): VisitHeading => {
  const at = dispensedAt(record);
  if (record.status === 'NEW') return { kind: 'created', at };
  if (record.status === 'CANCELLED')
    return {
      kind: 'cancelled',
      at,
      // Stamped on every cancel; the dispensed time stands in for a record
      // that somehow has none, so the head still says something true.
      cancelledAt: record.cancelledDatetime ?? at,
    };
  return { kind: 'dispensed', at };
};

/**
 * Why the open visit can't be edited, where that is the whole answer: a
 * finished (Verified) visit, a cancelled one, or a record still New. A Picked
 * visit says nothing.
 */
export const cannotEditReason = (
  record: DispensedRecord
): LocaleKey | undefined => {
  if (record.status === 'VERIFIED') return 'messages.finished-cannot-edit';
  if (record.status === 'CANCELLED') return 'messages.cancelled-cannot-edit';
  if (record.status === 'NEW') return 'messages.not-dispensed-cannot-edit';
  return undefined;
};

/** Only a finished visit can be cancelled, never a cancellation's mirror. */
export const canCancelVisit = (record: DispensedRecord): boolean =>
  canCancelPrescription(
    asPrescriptionStatus(record.status),
    record.isCancellation
  );
