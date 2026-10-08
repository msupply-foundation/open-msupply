import { describe, it, expect } from 'vitest';
import { rejectionDetail, stockErrorMessage } from './stockApi';
import type { GraphqlErrorItem } from '../../api/graphql';

// The stock mutation error normalisation (spec/stock S7 + contract). t() has no
// dictionary loaded in the node test env, so it returns the key — which is
// exactly what we assert (that each server identifier maps to the right message
// KEY). The full behavioural rejections are exercised against the real backend
// in the e2e/ suites (conformance C2).
//
// Anchors: spec/stock/cases/ — the rejection each identifier surfaces.
//   OMS-REG-SMV-02 .10 .18 .22 .25 .26 .27 .28 .34 .35 — adjustment and
//     new-stock rejections
//   OMS-REG-SMV-08 .16 .17 — repack rejections
//   OMS-REG-INV-02 .49 — an edit against another store's line

describe('rejectionDetail — the identifier from a plain GraphQL error', () => {
  it('reads extensions.details when present', () => {
    const errors: GraphqlErrorItem[] = [
      {
        message: 'Bad user input',
        extensions: { details: 'InvalidAdjustment' },
      },
    ];
    expect(rejectionDetail(errors)).toBe('InvalidAdjustment');
  });
  it('falls back to the message when details is absent', () => {
    expect(rejectionDetail([{ message: 'Forbidden' }])).toBe('Forbidden');
  });
});

describe('stockErrorMessage — identifier → message key (spec/stock S7)', () => {
  it('SMV-02.19/SMV-08.17: below-zero maps to the reduced-below-zero message', () => {
    expect(stockErrorMessage('StockLineReducedBelowZero')).toBe(
      'error.stock-reduced-below-zero'
    );
  });
  it('SMV-02.28: ledger-below-zero maps to its message', () => {
    expect(stockErrorMessage('LedgerWouldGoBelowZero')).toBe(
      'error.ledger-would-go-below-zero'
    );
  });
  it('SMV-02.10: reason-required defaults to the adjusting-stock copy', () => {
    expect(stockErrorMessage('AdjustmentReasonNotProvided')).toBe(
      'error.provide-reason-stock-adjustment'
    );
  });
  it('SMV-02.36: the new-stock override supplies the adding-stock copy', () => {
    expect(
      stockErrorMessage('AdjustmentReasonNotProvided', {
        AdjustmentReasonNotProvided: 'error.provide-reason-new-stock',
      })
    ).toBe('error.provide-reason-new-stock');
  });
  it('SMV-02.22: wrong-direction reason maps to the not-valid message', () => {
    expect(stockErrorMessage('AdjustmentReasonNotValid')).toBe(
      'error.provide-valid-reason'
    );
  });
  it('SMV-02.18: a non-positive amount maps to the invalid-adjustment message', () => {
    expect(stockErrorMessage('InvalidAdjustment')).toBe(
      'error.invalid-adjustment'
    );
  });
  it('SMV-08.16: fractional packs map to the fractional message', () => {
    expect(stockErrorMessage('CannotHaveFractionalPack')).toBe(
      'error.repack-cannot-be-fractional'
    );
  });
  it('SMV-02.35: duplicate identity maps to the already-exists message', () => {
    expect(stockErrorMessage('StockLineAlreadyExists')).toBe(
      'error.stock-line-already-exists'
    );
  });
  it('SMV-02.25–.27: backdating rejections map to their messages', () => {
    expect(stockErrorMessage('BackdatingNotEnabled')).toBe(
      'error.backdating-not-enabled'
    );
    expect(stockErrorMessage('CannotSetDateInFuture')).toBe(
      'error.date-in-future'
    );
    expect(stockErrorMessage('ExceedsMaximumBackdatingDays')).toBe(
      'error.exceeds-max-backdating-days'
    );
  });
  it("INV-02.49: another store's line maps to the not-found message", () => {
    expect(stockErrorMessage('StockDoesNotBelongToStore')).toBe(
      'error.stock-not-found'
    );
  });
  it('the Internal-error insert traps map to the generic new-stock message', () => {
    expect(stockErrorMessage('LineInsertError(PackSizeBelowOne)')).toBe(
      'error.new-stock-invalid'
    );
    expect(stockErrorMessage('ForeignKeyViolation on vvm_status_id')).toBe(
      'error.new-stock-invalid'
    );
  });
  it('an unmapped identifier falls back to a humanised form', () => {
    expect(stockErrorMessage('SomethingUnexpected')).toBe(
      'Something Unexpected'
    );
  });
});
