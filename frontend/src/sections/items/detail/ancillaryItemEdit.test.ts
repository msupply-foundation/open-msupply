import { describe, expect, it } from 'vitest';
import {
  EMPTY_FORM,
  buildUpsertInput,
  formatRatio,
  isFormValid,
  rejectionMessage,
  saveRejection,
} from './ancillaryItemEdit';

const PRINCIPAL = 'principal-1';

// OMS-REG-CAT-08.4/.6 — an ancillary item must be chosen with both ratio
// sides positive, and it can't be the principal (client mirror of the
// server-enforced self-link/positive-ratio guards).
describe('isFormValid (CAT-08.4/.6)', () => {
  it('is invalid with no ancillary item chosen', () => {
    expect(isFormValid(EMPTY_FORM, PRINCIPAL)).toBe(false);
  });

  it('is invalid when either ratio side is zero or negative', () => {
    const base = {
      ancillaryItemId: 'other-1',
      itemQuantity: 1,
      ancillaryQuantity: 1,
    };
    expect(isFormValid({ ...base, itemQuantity: 0 }, PRINCIPAL)).toBe(false);
    expect(isFormValid({ ...base, ancillaryQuantity: -1 }, PRINCIPAL)).toBe(
      false
    );
  });

  it('is invalid when the ancillary item is the principal', () => {
    expect(
      isFormValid(
        { ancillaryItemId: PRINCIPAL, itemQuantity: 1, ancillaryQuantity: 1 },
        PRINCIPAL
      )
    ).toBe(false);
  });

  it('is valid with a different item and a positive ratio', () => {
    expect(
      isFormValid(
        { ancillaryItemId: 'other-1', itemQuantity: 100, ancillaryQuantity: 1 },
        PRINCIPAL
      )
    ).toBe(true);
  });
});

describe('buildUpsertInput', () => {
  it('carries the principal id, the form fields, and the given id', () => {
    expect(
      buildUpsertInput(
        { ancillaryItemId: 'other-1', itemQuantity: 100, ancillaryQuantity: 1 },
        PRINCIPAL,
        'link-1'
      )
    ).toEqual({
      id: 'link-1',
      itemId: PRINCIPAL,
      ancillaryItemId: 'other-1',
      itemQuantity: 100,
      ancillaryQuantity: 1,
    });
  });
});

// OMS-REG-CAT-08.5/.7/.8/.9 — the three typed rejections get the case's own
// copy; DatabaseError/InternalError fall back to the server's own
// description, untranslated (confirmed against the real app's
// useUpsertAncillaryItem.ts — no generic "failed to save" key needed).
describe('saveRejection / rejectionMessage (CAT-08.5/.7/.8/.9)', () => {
  it('maps DuplicateAncillaryItem', () => {
    const rejection = saveRejection({
      __typename: 'DuplicateAncillaryItem',
      description: 'Duplicate',
    });
    expect(rejection).toEqual({ kind: 'duplicate' });
    // No dictionary is loaded in this test environment — t() falls back to
    // the key itself (same convention as stockApi.test.ts); the key is the
    // meaningful assertion here, not the English copy.
    expect(rejectionMessage(rejection)).toBe('error.duplicate-ancillary-item');
  });

  it('maps AncillaryCycleDetected', () => {
    const rejection = saveRejection({
      __typename: 'AncillaryCycleDetected',
      description: 'Cycle',
    });
    expect(rejection).toEqual({ kind: 'cycle' });
  });

  it('maps AncillaryMaxDepthExceeded with max/actual interpolated', () => {
    const rejection = saveRejection({
      __typename: 'AncillaryMaxDepthExceeded',
      description: 'Too deep',
      max: 5,
      actual: 6,
    });
    expect(rejection).toEqual({ kind: 'maxDepth', max: 5, actual: 6 });
    // t() falls back to the key (no dictionary loaded here) — the real
    // interpolation is exercised by whichever component test renders through
    // the loaded dictionary; this asserts saveRejection carried max/actual
    // through, which the toEqual above already covers.
    expect(rejectionMessage(rejection)).toBe(
      'error.ancillary-max-depth-exceeded'
    );
  });

  it('falls back to the raw description for DatabaseError/InternalError', () => {
    const rejection = saveRejection({
      __typename: 'InternalError',
      description: 'Something broke server-side',
    });
    expect(rejection).toEqual({
      kind: 'other',
      description: 'Something broke server-side',
    });
    expect(rejectionMessage(rejection)).toBe('Something broke server-side');
  });
});

describe('formatRatio', () => {
  it('renders the pair as x:y', () => {
    expect(formatRatio(100, 1)).toBe('100:1');
  });

  it('trims to 4 decimals without rounding away a meaningful fraction', () => {
    expect(formatRatio(1, 1.1)).toBe('1:1.1');
  });

  it('drops trailing zeros beyond 4 decimals', () => {
    expect(formatRatio(1.00001, 1)).toBe('1:1');
  });
});
