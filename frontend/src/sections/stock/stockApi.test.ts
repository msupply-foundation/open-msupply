import { describe, it, expect } from 'vitest';
import { rejectionDetail, stockErrorMessage } from './stockApi';
import type { GraphqlErrorItem } from '../../api/graphql';

// The stock mutation error normalisation (spec/stock S7 + contract). t() has no
// dictionary loaded in the node test env, so it returns the key — which is
// exactly what we assert (that each server identifier maps to the right message
// KEY). The full behavioural rejections are exercised against the real backend
// in the e2e/ suites (conformance C2).

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
  it('AC-A4/AC-R4: below-zero maps to the reduced-below-zero message', () => {
    expect(stockErrorMessage('StockLineReducedBelowZero')).toBe(
      'error.stock-reduced-below-zero'
    );
  });
  it('AC-A11: ledger-below-zero maps to its message', () => {
    expect(stockErrorMessage('LedgerWouldGoBelowZero')).toBe(
      'error.ledger-would-go-below-zero'
    );
  });
  it('AC-A7: reason-required defaults to the adjusting-stock copy', () => {
    expect(stockErrorMessage('AdjustmentReasonNotProvided')).toBe(
      'error.provide-reason-stock-adjustment'
    );
  });
  it('AC-N4: the new-stock override supplies the adding-stock copy', () => {
    expect(
      stockErrorMessage('AdjustmentReasonNotProvided', {
        AdjustmentReasonNotProvided: 'error.provide-reason-new-stock',
      })
    ).toBe('error.provide-reason-new-stock');
  });
  it('AC-A8: wrong-direction reason maps to the not-valid message', () => {
    expect(stockErrorMessage('AdjustmentReasonNotValid')).toBe(
      'error.provide-valid-reason'
    );
  });
  it('AC-A3: a non-positive amount maps to the invalid-adjustment message', () => {
    expect(stockErrorMessage('InvalidAdjustment')).toBe(
      'error.invalid-adjustment'
    );
  });
  it('AC-R3: fractional packs map to the fractional message', () => {
    expect(stockErrorMessage('CannotHaveFractionalPack')).toBe(
      'error.repack-cannot-be-fractional'
    );
  });
  it('AC-N3: duplicate identity maps to the already-exists message', () => {
    expect(stockErrorMessage('StockLineAlreadyExists')).toBe(
      'error.stock-line-already-exists'
    );
  });
  it('AC-A10: backdating rejections map to their messages', () => {
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
  it("AC-E9: another store's line maps to the not-found message", () => {
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
