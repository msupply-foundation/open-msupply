import { describe, expect, it } from 'vitest';
import {
  asPrescriptionStatus,
  canCancelPrescription,
  canDeletePrescription,
  hasDispensedLines,
  isReadOnly,
  isBatchLine,
  isPlaceholderLine,
  isRenderableLine,
  nextStatuses,
  prescriptionDateOf,
  statusSteps,
  zeroQuantityLineCount,
} from './prescriptionStatus';

describe('isReadOnly (AC-S3 — VERIFIED and CANCELLED freeze the record)', () => {
  it('is editable while NEW and PICKED, frozen from VERIFIED', () => {
    expect(isReadOnly('NEW')).toBe(false);
    expect(isReadOnly('PICKED')).toBe(false);
    expect(isReadOnly('VERIFIED')).toBe(true);
    expect(isReadOnly('CANCELLED')).toBe(true);
  });

  it('treats an unexpected wire status as read-only (the safe default)', () => {
    expect(isReadOnly(asPrescriptionStatus('SHIPPED'))).toBe(true);
  });
});

describe('nextStatuses (D40 — forward transitions only; AC-S4 — the skip is offered)', () => {
  it('offers PICKED and the VERIFIED skip from NEW', () => {
    expect(nextStatuses('NEW')).toEqual(['PICKED', 'VERIFIED']);
  });
  it('offers only VERIFIED from PICKED — never the current status', () => {
    expect(nextStatuses('PICKED')).toEqual(['VERIFIED']);
  });
  it('offers nothing once read-only (the button is hidden, D39)', () => {
    expect(nextStatuses('VERIFIED')).toEqual([]);
    expect(nextStatuses('CANCELLED')).toEqual([]);
  });
});

describe('canDeletePrescription (AC-D1/D2 — deletable while editable only)', () => {
  it('allows NEW and PICKED, refuses VERIFIED and CANCELLED', () => {
    expect(canDeletePrescription('NEW')).toBe(true);
    expect(canDeletePrescription('PICKED')).toBe(true);
    expect(canDeletePrescription('VERIFIED')).toBe(false);
    expect(canDeletePrescription('CANCELLED')).toBe(false);
  });
});

describe('canCancelPrescription (.29/.33 — VERIFIED only, never a reversal)', () => {
  it('offers cancel on VERIFIED alone', () => {
    expect(canCancelPrescription('VERIFIED', false)).toBe(true);
    expect(canCancelPrescription('NEW', false)).toBe(false);
    expect(canCancelPrescription('PICKED', false)).toBe(false);
    expect(canCancelPrescription('CANCELLED', false)).toBe(false);
  });

  // The cancellation mirror is itself VERIFIED (the item ledger's stock-return
  // row opens it), so the status gate alone would offer a cancel the server
  // always refuses.
  it('withholds cancel on a cancellation reversal', () => {
    expect(canCancelPrescription('VERIFIED', true)).toBe(false);
  });
});

describe('isRenderableLine (.25 / .33 — placeholders in, returns in)', () => {
  it('renders dispensed lines', () => {
    expect(isRenderableLine({ type: 'STOCK_OUT' })).toBe(true);
  });

  // The placeholder row is the ONLY on-screen trace of a prescribed quantity
  // recorded for an item with no stock (.25). Filtering it out left the table
  // empty, so a save that had worked looked like one that had failed — and
  // there was nothing to click to revisit or delete it. The current app shows
  // the row too (probed side by side).
  it('renders the prescribed-quantity placeholder', () => {
    expect(isRenderableLine({ type: 'UNALLOCATED_STOCK' })).toBe(true);
    expect(isPlaceholderLine({ type: 'UNALLOCATED_STOCK' })).toBe(true);
    expect(isPlaceholderLine({ type: 'STOCK_OUT' })).toBe(false);
  });

  // Rendering the placeholder must NOT make it count as dispensed: the status
  // guard (.22) and the zero-quantity warning (AC-S5) both ignore it.
  it('does not make a placeholder-only prescription look dispensed', () => {
    expect(hasDispensedLines([{ type: 'UNALLOCATED_STOCK' }])).toBe(false);
    expect(
      zeroQuantityLineCount([{ type: 'UNALLOCATED_STOCK', numberOfPacks: 0 }])
    ).toBe(0);
  });

  // The reversal's lines are the SAME lines retyped: an empty table here is
  // the ledger-reached mirror showing nothing (the reported defect).
  it('renders a cancellation reversal returned lines', () => {
    expect(isRenderableLine({ type: 'STOCK_IN' })).toBe(true);
  });
});

describe('isBatchLine (the read-only modal batch grid)', () => {
  it('counts dispensed lines and a reversal returned lines as batches', () => {
    expect(isBatchLine({ type: 'STOCK_OUT' })).toBe(true);
    expect(isBatchLine({ type: 'STOCK_IN' })).toBe(true);
  });

  // The placeholder renders as a LINE-TABLE row but is not a batch: it has no
  // stock line, so reusing isRenderableLine here gave an item with only a
  // placeholder a Batches table holding one all-but-empty row.
  it('excludes the prescribed-quantity placeholder', () => {
    expect(isBatchLine({ type: 'UNALLOCATED_STOCK' })).toBe(false);
    expect([{ type: 'UNALLOCATED_STOCK' }].filter(isBatchLine)).toHaveLength(0);
  });
});

describe('statusSteps (AC-V2 — CANCELLED appears only once cancelled)', () => {
  const base = {
    createdDatetime: '2026-07-23T00:00:00Z',
    pickedDatetime: '2026-07-23T01:00:00Z',
    verifiedDatetime: null,
    cancelledDatetime: null,
  };
  it('shows the three lifecycle stages on a live prescription', () => {
    expect(statusSteps({ ...base, status: 'PICKED' })).toHaveLength(3);
  });
  it('appends the cancelled stage on a cancelled prescription', () => {
    const steps = statusSteps({
      ...base,
      status: 'CANCELLED',
      cancelledDatetime: '2026-07-23T02:00:00Z',
    });
    expect(steps).toHaveLength(4);
    expect(steps[3].date).toBe('2026-07-23T02:00:00Z');
  });
});

describe('prescriptionDateOf (AC-L1 — backdated when set, else created)', () => {
  it('prefers the backdated time', () => {
    expect(
      prescriptionDateOf({
        backdatedDatetime: '2026-07-20T10:00:00Z',
        createdDatetime: '2026-07-23T00:00:00Z',
      })
    ).toBe('2026-07-20T10:00:00Z');
  });
  it('falls back to creation', () => {
    expect(
      prescriptionDateOf({
        backdatedDatetime: null,
        createdDatetime: '2026-07-23T00:00:00Z',
      })
    ).toBe('2026-07-23T00:00:00Z');
  });
});

describe('hasDispensedLines (AC-S6 — placeholder-only counts as no lines)', () => {
  it('blocks on empty and on placeholder-only line sets', () => {
    expect(hasDispensedLines([])).toBe(false);
    expect(hasDispensedLines([{ type: 'UNALLOCATED_STOCK' }])).toBe(false);
  });
  it('passes once a dispensed line exists', () => {
    expect(
      hasDispensedLines([{ type: 'UNALLOCATED_STOCK' }, { type: 'STOCK_OUT' }])
    ).toBe(true);
  });
});

describe('zeroQuantityLineCount (AC-S5 — the confirmation counts removable rows)', () => {
  it('counts zero-pack dispensed rows only — placeholders never count', () => {
    expect(
      zeroQuantityLineCount([
        { type: 'STOCK_OUT', numberOfPacks: 0 },
        { type: 'STOCK_OUT', numberOfPacks: 1.5 },
        { type: 'UNALLOCATED_STOCK', numberOfPacks: 0 },
      ])
    ).toBe(1);
  });
});
