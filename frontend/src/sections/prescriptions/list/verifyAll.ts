import type { GraphqlResult } from '@/api/graphql';
import { calendarDateToInstant, type Instant } from '@/intl/calendarDate';
import { formatNumber, localisedMonthYear, tPlural } from '@/intl';
import type {
  PrescriptionsToVerifyResult,
  VerifyPrescriptionsResult,
} from './prescriptions.generated';
import { hasDispensedLines } from '../prescriptionStatus';

// Verify all's pure half (spec/prescriptions rules › verifying the month's
// records): which months it offers, where a month ends, which records it
// verifies, and what a batch's reply means. The dialog is VerifyAllAction.

/** A month as `YYYY-MM`, the value of the month select. */
export type MonthKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

const monthKeyOf = (year: number, monthIndex: number): MonthKey => {
  // Date normalises a negative or overflowing month index into the right year.
  const d = new Date(year, monthIndex, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/**
 * This month and the twelve before it, newest first, in the device's own
 * calendar (OMS-REG-DIS-12.309).
 */
export const verifiableMonths = (today: Date): MonthKey[] =>
  Array.from({ length: 13 }, (_, i) =>
    monthKeyOf(today.getFullYear(), today.getMonth() - i)
  );

/** Last month, the month chosen at first (OMS-REG-DIS-12.309). */
export const lastMonth = (today: Date): MonthKey =>
  monthKeyOf(today.getFullYear(), today.getMonth() - 1);

const parts = (month: MonthKey): [number, number] => {
  const [year, m] = month.split('-').map(Number);
  return [year ?? 0, (m ?? 1) - 1];
};

/**
 * The month's last instant in the user's time zone, 23:59:59.999 on its last
 * day, as UTC: the inclusive bound on the picked time (OMS-REG-DIS-12.313).
 */
export const monthEnd = (month: MonthKey): Instant => {
  const [year, monthIndex] = parts(month);
  // Day 0 of the next month is this month's last day.
  const last = new Date(year, monthIndex + 1, 0);
  return calendarDateToInstant(
    `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
    { endOfDay: true }
  );
};

/** The month and year in the app's language, e.g. "October 2026". */
export const monthLabel = (month: MonthKey): string => {
  const [year, monthIndex] = parts(month);
  return localisedMonthYear(new Date(year, monthIndex, 1));
};

/** The Picked records a read found: those Verify sends, and those it leaves. */
export interface ToVerify {
  /** Records with something dispensed: Verify verifies these. */
  ids: string[];
  /**
   * Records with nothing dispensed (no lines, or only a prescribed-quantity
   * placeholder), left Picked as the record screen leaves them
   * (OMS-REG-DIS-12.322): verified, one holding a placeholder could never be
   * cancelled.
   */
  leftOut: number;
}

/**
 * Splits a read of the month's Picked records by the record screen's own
 * rule for what can be verified (`hasDispensedLines`, OMS-REG-DIS-04.22).
 */
export const splitToVerify = (
  nodes: PrescriptionsToVerifyResult['invoices']['nodes']
): ToVerify => {
  const ids: string[] = [];
  let leftOut = 0;
  for (const node of nodes) {
    if (hasDispensedLines(node.lines.nodes)) ids.push(node.id);
    else leftOut += 1;
  }
  return { ids, leftOut };
};

/** Verify all's messages that count records. */
export type CountKey =
  | 'messages.verify-all-count'
  | 'messages.verify-all-done'
  | 'messages.verify-all-left-out';

/**
 * A message counting `n` records of the month `month` names, the count in the
 * language's own digits as the month's are: `tPlural` alone would put a Latin
 * 7 beside an Arabic ٢٠٢٦ (CCS-20260911-F8).
 */
export const countMessage = (key: CountKey, n: number, month: string) =>
  tPlural(key, n, { count: formatNumber(n), month });

export type VerifyOutcome =
  | { kind: 'verified'; count: number }
  /**
   * The server refused a record, so it verified none (OMS-REG-DIS-12.317).
   */
  | { kind: 'refused' }
  /**
   * The app's own dialogs have already told the user (a refused permission,
   * a server fault, a lost connection, an expired session). The Verify may
   * or may not have landed, so the dialog adds nothing of its own and reads
   * the number again, which shows what happened.
   */
  | { kind: 'reported' };

/**
 * What a Verify reply means, for a request sent WITHOUT `returnGraphqlErrors`.
 * A record the server won't verify comes back as an error row in a success
 * reply. The batch is one transaction, and a failed one still reports success
 * for the rows it rolled back (contract wire trap), so a single row that isn't
 * the record means none was verified. Anything but a success is a failure the
 * app has already reported.
 */
export const verifyOutcome = (
  result: GraphqlResult<VerifyPrescriptionsResult>,
  sent: number
): VerifyOutcome => {
  if (result.kind !== 'success') return { kind: 'reported' };
  const rows = result.data.batchPrescription.updatePrescriptions ?? [];
  const allVerified =
    rows.length === sent &&
    rows.every(row => row.response.__typename === 'InvoiceNode');
  return allVerified ? { kind: 'verified', count: sent } : { kind: 'refused' };
};
