import { round9 } from '@/domain/allocation';
import type { LocaleKey } from '@/intl';
import {
  asPrescriptionStatus,
  canCancelPrescription,
} from '../prescriptionStatus';
import { itemsGiven } from '../list/medicinesGiven';
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
 * amount (in its unit) and price added up over its batches, by name, grouped
 * as Dispensing records groups them (`itemsGiven`), so the two agree. A
 * service shows its price and no amount.
 */
export const visitLines = (lines: readonly RecordLine[]): VisitLine[] =>
  itemsGiven(lines, { services: true }).map(given => {
    const first = given.lines[0];
    const isService = first?.type === 'SERVICE';
    return {
      itemId: given.itemId,
      name: given.name,
      unit: first?.item.unitName ?? null,
      units: isService ? undefined : given.amount,
      price: round9(given.lines.reduce((sum, l) => sum + l.totalAfterTax, 0)),
    };
  });

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

/**
 * Only a Picked visit can be edited from the Simple screen (rules › editing a
 * dispensed visit): a finished one is read only, and a New one isn't
 * dispensed yet.
 */
export const canEditVisit = (record: DispensedRecord): boolean =>
  record.status === 'PICKED' && !record.isCancellation;

/** The record as read again after a change to it. */
export type RecordRead =
  | { kind: 'read'; record: DispensedRecord }
  /** No dispensing record with the id: deleted. */
  | { kind: 'gone' };

/**
 * What a cancel that was refused, or whose reply was lost, did, by the record
 * read after it (rules › a dispensed visit): it may have gone through, now or
 * by an earlier press, since a second cancel is refused. Cancelled is
 * cancelled; any other status is not; a read that failed (undefined) can't
 * tell.
 */
export const afterCancelRead = (
  read: RecordRead | undefined
): 'cancelled' | 'not-cancelled' | 'unknown' => {
  if (read?.kind !== 'read') return 'unknown';
  return read.record.status === 'CANCELLED' ? 'cancelled' : 'not-cancelled';
};

/** Only a finished visit can be cancelled, never a cancellation's mirror. */
export const canCancelVisit = (record: DispensedRecord): boolean =>
  canCancelPrescription(
    asPrescriptionStatus(record.status),
    record.isCancellation
  );
