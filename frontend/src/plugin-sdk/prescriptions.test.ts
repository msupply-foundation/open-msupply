import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The prescription data functions (implementation-plan K3): a prescription
 * written idempotently from a form. The transport and the entered store are
 * the mocked edges; the order of the writes and what they carry run for real.
 */

const graphqlFetch = vi.fn();

vi.mock('../api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));
vi.mock('../store/storeContext', () => ({ currentStoreId: () => 'store-a' }));

import {
  SdkInsertPrescription,
  SdkItemBatches,
  SdkPickPrescription,
  SdkPrescriptionSummary,
  SdkSavePrescriptionItemLines,
} from './prescriptions.generated';
import { createPrescription } from './prescriptions';

beforeEach(() => {
  graphqlFetch.mockReset();
});

describe('createPrescription', () => {
  const batches = {
    kind: 'success',
    data: {
      historicalStockLines: {
        __typename: 'StockLineConnector',
        nodes: [
          {
            __typename: 'StockLineNode',
            id: 'line-1',
            batch: 'B1',
            expiryDate: '2027-01-31',
            packSize: 3,
            availableNumberOfPacks: 10,
            onHold: false,
          },
        ],
      },
    },
  };
  const invoice = (status: string) => ({
    kind: 'success',
    data: {
      invoice: {
        __typename: 'InvoiceNode',
        id: 'rx-1',
        invoiceNumber: 42,
        status,
        createdDatetime: '2026-10-12T00:00:00Z',
        pickedDatetime: null,
        store: { __typename: 'StoreNode', id: 'store-a' },
        lines: { __typename: 'InvoiceLineConnector', nodes: [] },
      },
    },
  });
  const notFound = {
    kind: 'success',
    data: { invoice: { __typename: 'NodeError' } },
  };

  const respond = (summary: unknown) =>
    graphqlFetch.mockImplementation(async (query: unknown) => {
      if (query === SdkPrescriptionSummary) return summary;
      if (query === SdkInsertPrescription) {
        return {
          kind: 'success',
          data: {
            insertPrescription: {
              __typename: 'InvoiceNode',
              id: 'rx-1',
              invoiceNumber: 42,
            },
          },
        };
      }
      if (query === SdkItemBatches) return batches;
      if (query === SdkSavePrescriptionItemLines) {
        return {
          kind: 'success',
          data: {
            savePrescriptionItemLines: {
              __typename: 'InvoiceNode',
              id: 'rx-1',
            },
          },
        };
      }
      if (query === SdkPickPrescription) {
        return {
          kind: 'success',
          data: {
            updatePrescription: { __typename: 'InvoiceNode', id: 'rx-1' },
          },
        };
      }
      throw new Error('unexpected query');
    });

  const input = {
    id: 'rx-1',
    patientId: 'fatouma',
    itemId: 'item-pop',
    lines: [
      { stockLineId: 'line-1', numberOfPacks: 2 },
      { stockLineId: 'line-2', numberOfPacks: 0 },
    ],
  };
  const queries = () => graphqlFetch.mock.calls.map(([query]) => query);

  it('creates it, saves the batches given with the total in units, and picks it', async () => {
    respond(notFound);
    expect(await createPrescription(input)).toEqual({
      kind: 'created',
      invoiceNumber: 42,
    });
    expect(queries()).toEqual([
      SdkPrescriptionSummary,
      SdkInsertPrescription,
      SdkItemBatches,
      SdkSavePrescriptionItemLines,
      SdkPickPrescription,
    ]);
    const save = graphqlFetch.mock.calls.find(
      ([query]) => query === SdkSavePrescriptionItemLines
    ) as [unknown, { input: { lines: unknown[]; prescribedQuantity: number } }];
    expect(save[1].input.lines).toHaveLength(1);
    expect(save[1].input.lines[0]).toMatchObject({
      stockLineId: 'line-1',
      numberOfPacks: 2,
    });
    expect(save[1].input.prescribedQuantity).toBe(6);
  });

  it('leaves one already picked as it is', async () => {
    respond(invoice('PICKED'));
    expect(await createPrescription(input)).toEqual({
      kind: 'created',
      invoiceNumber: 42,
    });
    expect(queries()).toEqual([SdkPrescriptionSummary]);
  });

  it('completes one an interrupted call left new, without a second insert', async () => {
    respond(invoice('NEW'));
    expect(await createPrescription(input)).toEqual({
      kind: 'created',
      invoiceNumber: 42,
    });
    expect(queries()).not.toContain(SdkInsertPrescription);
    expect(queries()).toContain(SdkPickPrescription);
  });

  it("reports the server's refusal with its message", async () => {
    respond(notFound);
    const fallback = graphqlFetch.getMockImplementation();
    graphqlFetch.mockImplementation(
      async (query: unknown, ...rest: unknown[]) =>
        query === SdkPickPrescription
          ? {
              kind: 'success',
              data: {
                updatePrescription: {
                  __typename: 'UpdatePrescriptionError',
                  error: {
                    __typename: 'InvoiceIsNotEditable',
                    description: 'Invoice is not editable',
                  },
                },
              },
            }
          : fallback?.(query, ...rest)
    );
    expect(await createPrescription(input)).toEqual({
      kind: 'failed',
      message: 'Invoice is not editable',
    });
  });
});
