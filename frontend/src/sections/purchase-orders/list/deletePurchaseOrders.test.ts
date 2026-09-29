import { describe, expect, it } from 'vitest';
import {
  deleteOutcome,
  summariseOutcomes,
  type DeleteOutcome,
} from './deletePurchaseOrders';
import type { GraphqlResult } from '@/api/graphql';
import type { DeletePurchaseOrderResult } from './purchaseOrders.generated';

// Anchors: spec/purchase-orders/cases/
//   OMS-FUN-PO-15.11 — an order in New or Ready for approval can be deleted
//                      from the list; one in Ready for sending or later cannot
//   OMS-FUN-PO-15.13 — an order an external inbound shipment points at cannot
//                      be deleted in any state
// The dialog half — the confirmation gate (OMS-FUN-PO-15.1) and the report's
// rendering — lives in DeletePurchaseOrdersAction. These tests pin how each
// call's result becomes an outcome, and how outcomes fold into the report the
// dialog shows: the deletion is N independent calls, so a refusal must not
// swallow the successes beside it.

const success = (
  deletePurchaseOrder: DeletePurchaseOrderResult['deletePurchaseOrder']
): GraphqlResult<DeletePurchaseOrderResult> => ({
  kind: 'success',
  data: { deletePurchaseOrder },
});

const deleted = success({ __typename: 'DeleteResponse', id: 'po-1' });

const notDeletable = success({
  __typename: 'DeletePurchaseOrderError',
  error: {
    __typename: 'CannotDeletePurchaseOrder',
    description: 'Cannot delete non-new purchase order',
  },
});

const recordNotFound = success({
  __typename: 'DeletePurchaseOrderError',
  error: { __typename: 'RecordNotFound', description: 'Record not found' },
});

describe('deleteOutcome', () => {
  it('reads a DeleteResponse as deleted', () => {
    expect(deleteOutcome('po-1', deleted)).toEqual({
      kind: 'deleted',
      id: 'po-1',
    });
  });

  it('OMS-FUN-PO-15.11 — reads the state refusal as not-deletable', () => {
    expect(deleteOutcome('po-2', notDeletable)).toEqual({
      kind: 'notDeletable',
      id: 'po-2',
    });
  });

  it('counts a missing record as a plain failure, not a refusal', () => {
    // RecordNotFound is typed, but it says the order is already gone — not
    // that the domain refused this one, so it must not reach the rule's
    // wording.
    expect(deleteOutcome('po-3', recordNotFound)).toEqual({
      kind: 'failed',
      id: 'po-3',
    });
  });

  it('OMS-FUN-PO-15.13 — counts an untyped failure as a plain failure', () => {
    // An order a shipment points at fails as a top-level `Internal error`
    // (contract ⚠️), which reaches us as a graphqlError result — there is no
    // typed member to distinguish it, so it is reported by count alone.
    expect(
      deleteOutcome('po-4', {
        kind: 'graphqlError',
        message: 'Internal error',
        errors: [],
      })
    ).toEqual({ kind: 'failed', id: 'po-4' });
  });
});

describe('summariseOutcomes', () => {
  it('counts the deletions and lists the refusals side by side', () => {
    const outcomes: DeleteOutcome[] = [
      { kind: 'deleted', id: 'po-1' },
      { kind: 'notDeletable', id: 'po-2' },
      { kind: 'deleted', id: 'po-3' },
      { kind: 'failed', id: 'po-4' },
      { kind: 'notDeletable', id: 'po-5' },
    ];
    expect(summariseOutcomes(outcomes)).toEqual({
      deletedCount: 2,
      notDeletable: ['po-2', 'po-5'],
      failedCount: 1,
    });
  });

  it('reports an all-success selection with nothing to acknowledge', () => {
    expect(
      summariseOutcomes([
        { kind: 'deleted', id: 'po-1' },
        { kind: 'deleted', id: 'po-2' },
      ])
    ).toEqual({ deletedCount: 2, notDeletable: [], failedCount: 0 });
  });
});
