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
import {
  createPrescription,
  issuableBatches,
  toPrescriptionSummaryView,
} from './prescriptions';

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

// OMS-REG-PLG-DJ-03.65: a prescription given from two batches reads as the
// whole quantity of its item, not one batch's.
describe('toPrescriptionSummaryView', () => {
  const line = (itemId: string, numberOfPacks: number, packSize = 1) => ({
    __typename: 'InvoiceLineNode' as const,
    itemId,
    itemName: `${itemId} name`,
    numberOfPacks,
    packSize,
  });

  it("adds up an item's batches into one line, in units", () => {
    const view = toPrescriptionSummaryView({
      __typename: 'InvoiceNode',
      id: 'rx-1',
      invoiceNumber: 42,
      status: 'PICKED',
      createdDatetime: '2026-10-12T00:00:00Z',
      pickedDatetime: null,
      lines: {
        __typename: 'InvoiceLineConnector',
        nodes: [line('pop', 2), line('diu', 1), line('pop', 0.5, 2)],
      },
    });
    expect(view.lines).toEqual([
      { itemId: 'pop', itemName: 'pop name', units: 3 },
      { itemId: 'diu', itemName: 'diu name', units: 1 },
    ]);
  });
});

describe('issuableBatches', () => {
  const TODAY = new Date('2026-10-14T12:00:00');
  const line = (id: string, fields: Record<string, unknown> = {}) => ({
    __typename: 'StockLineNode' as const,
    id,
    batch: id,
    expiryDate: '2027-06-30',
    packSize: 1,
    availableNumberOfPacks: 10,
    onHold: false,
    location: null,
    vvmStatus: null,
    ...fields,
  });
  const prefs = {
    expiredStockPreventIssue: false,
    expiredStockIssueThreshold: 0,
    manageVvmStatusForStock: false,
    sortByVvmStatusThenExpiry: false,
  };
  const ids = (
    lines: ReturnType<typeof line>[],
    overrides: Partial<typeof prefs> = {}
  ) => issuableBatches(lines, { ...prefs, ...overrides }, TODAY).map(b => b.id);

  it('leaves out a batch with nothing available, or on hold itself or by its location', () => {
    expect(
      ids([
        line('ok'),
        line('empty', { availableNumberOfPacks: 0 }),
        line('held', { onHold: true }),
        line('held-location', {
          location: { __typename: 'LocationNode', onHold: true },
        }),
      ])
    ).toEqual(['ok']);
  });

  it('leaves out expired stock only under the store preference', () => {
    const lines = [line('ok'), line('expired', { expiryDate: '2026-10-01' })];
    expect(ids(lines)).toEqual(['expired', 'ok']);
    expect(ids(lines, { expiredStockPreventIssue: true })).toEqual(['ok']);
  });

  it('leaves out an unusable VVM status only under VVM management', () => {
    const lines = [
      line('ok'),
      line('unusable', {
        vvmStatus: { __typename: 'VvmstatusNode', unusable: true, priority: 3 },
      }),
    ];
    expect(ids(lines)).toEqual(['ok', 'unusable']);
    expect(ids(lines, { manageVvmStatusForStock: true })).toEqual(['ok']);
  });

  it("lists them in the prescription screen's order", () => {
    const vvm = (priority: number) => ({
      __typename: 'VvmstatusNode',
      unusable: false,
      priority,
    });
    const lines = [
      line('late', { expiryDate: '2027-09-30', vvmStatus: vvm(1) }),
      line('soon', { expiryDate: '2027-03-31', vvmStatus: vvm(2) }),
    ];
    expect(ids(lines)).toEqual(['soon', 'late']);
    expect(ids(lines, { sortByVvmStatusThenExpiry: true })).toEqual([
      'late',
      'soon',
    ]);
  });
});
