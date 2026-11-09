import { describe, expect, it } from 'vitest';
import { isOwnDocument } from './requisitionDocuments';

// Anchors: spec/requisitions/cases/OMS-REG-DIST-06.
//   .40 — a transferred document (recorded against the linked internal order)
//         offers no remove
//   .41 — a remove shows only on a document recorded against the requisition
//         itself
// (rules.md § documents; contract.md § documents.)

const REQUISITION_ID = 'response-1';
const LINKED_ID = 'internal-order-1';

describe('isOwnDocument', () => {
  it('.41 treats a document recorded against the requisition as its own', () => {
    expect(isOwnDocument({ recordId: REQUISITION_ID }, REQUISITION_ID)).toBe(
      true
    );
  });

  it('.40 treats a document from the linked internal order as transferred', () => {
    expect(isOwnDocument({ recordId: LINKED_ID }, REQUISITION_ID)).toBe(false);
  });

  it('treats a document recorded against any other record as not its own', () => {
    expect(isOwnDocument({ recordId: 'other' }, REQUISITION_ID)).toBe(false);
    expect(isOwnDocument({ recordId: '' }, REQUISITION_ID)).toBe(false);
  });
});
