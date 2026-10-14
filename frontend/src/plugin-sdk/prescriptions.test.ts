import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The prescription data functions: a prescription written idempotently from a
 * form. The transport and the entered store are the mocked edges; the order of
 * the writes and what they carry run for real.
 */

const graphqlFetch = vi.fn();
const reportPermissionDenied = vi.fn();

vi.mock('../api/graphql', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/graphql')>()),
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  reportPermissionDenied: (permissions: string[]) =>
    reportPermissionDenied(permissions),
}));
vi.mock('../store/storeContext', () => ({ currentStoreId: () => 'store-a' }));

import {
  SdkInsertPrescription,
  SdkPickPrescription,
  SdkPrescriptionSummary,
  SdkSavePrescriptionItemLines,
} from './prescriptions.generated';
import { createPrescription } from './prescriptions';

beforeEach(() => {
  graphqlFetch.mockReset();
  reportPermissionDenied.mockReset();
});

describe('createPrescription', () => {
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
    prescribedQuantity: 6,
  };
  const queries = () => graphqlFetch.mock.calls.map(([query]) => query);

  it('creates it, saves the batches given with the quantity prescribed, and picks it', async () => {
    respond(notFound);
    expect(await createPrescription(input)).toEqual({
      kind: 'created',
      invoiceNumber: 42,
    });
    expect(queries()).toEqual([
      SdkPrescriptionSummary,
      SdkInsertPrescription,
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

  it('writes nothing when it cannot tell whether one exists', async () => {
    respond({ kind: 'unexpectedError' });
    expect(await createPrescription(input)).toEqual({
      kind: 'failed',
      message: 'error.prescription-not-created',
    });
    expect(queries()).toEqual([SdkPrescriptionSummary]);
  });

  it('opens the permission dialog for a refusal on permission', async () => {
    respond(notFound);
    const fallback = graphqlFetch.getMockImplementation();
    graphqlFetch.mockImplementation(
      async (query: unknown, ...rest: unknown[]) =>
        query === SdkInsertPrescription
          ? {
              kind: 'graphqlError',
              message: 'Forbidden',
              errors: [{ message: 'Forbidden' }],
            }
          : fallback?.(query, ...rest)
    );
    expect(await createPrescription(input)).toEqual({
      kind: 'failed',
      message: 'error.prescription-not-created',
    });
    expect(reportPermissionDenied).toHaveBeenCalledTimes(1);
    expect(queries()).not.toContain(SdkSavePrescriptionItemLines);
  });
});
