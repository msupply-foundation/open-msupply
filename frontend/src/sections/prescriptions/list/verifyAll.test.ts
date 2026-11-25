import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type { VerifyPrescriptionsResult } from './prescriptions.generated';
import {
  lastMonth,
  monthEnd,
  monthLabel,
  verifiableMonths,
  verifyOutcome,
} from './verifyAll';

// spec/prescriptions rules › verifying the month's records.

describe('verifiableMonths — OMS-REG-DIS-12.309', () => {
  it('offers this month and the twelve before it, newest first', () => {
    const months = verifiableMonths(new Date(2026, 10, 25));
    expect(months).toHaveLength(13);
    expect(months[0]).toBe('2026-11');
    expect(months[1]).toBe('2026-10');
    expect(months[12]).toBe('2025-11');
  });

  it('crosses into the year before in January', () => {
    const months = verifiableMonths(new Date(2027, 0, 3));
    expect(months.slice(0, 3)).toEqual(['2027-01', '2026-12', '2026-11']);
  });

  it('chooses last month at first', () => {
    expect(lastMonth(new Date(2026, 10, 25))).toBe('2026-10');
    expect(lastMonth(new Date(2027, 0, 1))).toBe('2026-12');
    expect(verifiableMonths(new Date(2026, 10, 25))).toContain(
      lastMonth(new Date(2026, 10, 25))
    );
  });

  it('is the same month on its first and last days', () => {
    expect(verifiableMonths(new Date(2026, 9, 1, 0, 0))[0]).toBe('2026-10');
    expect(verifiableMonths(new Date(2026, 9, 31, 23, 59))[0]).toBe('2026-10');
  });
});

describe('monthEnd — OMS-REG-DIS-12.313', () => {
  it("is the month's last instant in the user's time zone", () => {
    expect(monthEnd('2026-10')).toBe(
      new Date(2026, 9, 31, 23, 59, 59, 999).toISOString()
    );
  });

  it('knows each month has its own last day, February in a leap year too', () => {
    expect(monthEnd('2026-11')).toBe(
      new Date(2026, 10, 30, 23, 59, 59, 999).toISOString()
    );
    expect(monthEnd('2028-02')).toBe(
      new Date(2028, 1, 29, 23, 59, 59, 999).toISOString()
    );
    expect(monthEnd('2026-12')).toBe(
      new Date(2026, 11, 31, 23, 59, 59, 999).toISOString()
    );
  });

  it("takes a record picked late on the month's last day and not one early on the next", () => {
    const end = new Date(monthEnd('2026-10')).getTime();
    expect(new Date(2026, 9, 31, 23, 30).getTime()).toBeLessThanOrEqual(end);
    expect(new Date(2026, 10, 1, 0, 0).getTime()).toBeGreaterThan(end);
  });
});

describe('monthLabel', () => {
  it('names the month and year', () => {
    expect(monthLabel('2026-10')).toBe('October 2026');
    expect(monthLabel('2027-01')).toBe('January 2027');
  });
});

const reply = (
  typenames: Array<'InvoiceNode' | 'UpdatePrescriptionError' | 'NodeError'>
): GraphqlResult<VerifyPrescriptionsResult> => ({
  kind: 'success',
  data: {
    batchPrescription: {
      updatePrescriptions: typenames.map((__typename, i) => ({
        id: `p${i}`,
        response: { __typename },
      })),
    },
  },
});

describe('verifyOutcome', () => {
  it('counts the records when every one came back verified — .315', () => {
    expect(verifyOutcome(reply(['InvoiceNode', 'InvoiceNode']), 2)).toEqual({
      kind: 'verified',
      count: 2,
    });
  });

  it('reads one refused record as none verified — .317', () => {
    // The batch rolls back, but still reports the other row as verified.
    expect(
      verifyOutcome(reply(['InvoiceNode', 'UpdatePrescriptionError']), 2)
    ).toEqual({ kind: 'refused' });
    expect(verifyOutcome(reply(['NodeError', 'InvoiceNode']), 2)).toEqual({
      kind: 'refused',
    });
  });

  it('reads a reply missing rows as none verified', () => {
    expect(verifyOutcome(reply(['InvoiceNode']), 2)).toEqual({
      kind: 'refused',
    });
  });

  it('reads a GraphQL error from the server as none verified — .317', () => {
    expect(
      verifyOutcome(
        { kind: 'graphqlError', message: 'Record not found', errors: [] },
        1
      )
    ).toEqual({ kind: 'refused' });
  });

  it("leaves the app's own error dialog to report a lost connection", () => {
    expect(verifyOutcome({ kind: 'unexpectedError' }, 1)).toEqual({
      kind: 'reported',
    });
    expect(verifyOutcome({ kind: 'forbidden' }, 1)).toEqual({
      kind: 'reported',
    });
  });
});
