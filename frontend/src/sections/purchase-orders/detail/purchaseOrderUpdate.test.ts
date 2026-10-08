import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlFetch } from '../../../api/graphql';
import {
  cascadedDateFields,
  cascadeDeliveryDates,
  closePurchaseOrderLines,
  deletePurchaseOrderLines,
  deliveryDatesVary,
  updatePurchaseOrder,
} from './purchaseOrderUpdate';

// The wire folds behind an order's own screen (contract § an order's own
// screen, § acting on a selection of lines). graphqlFetch is mocked at the
// module seam — these functions ARE the response mapping, so the mock's shape
// is the test subject's input. No dictionary is loaded here, so t() falls back
// to its key and translateServerError to its sentence-cased identifier.

vi.mock('../../../api/graphql', () => ({
  graphqlFetch: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

const success = (data: unknown) => ({ kind: 'success', data }) as never;
const saved = (field: string) =>
  success({ [field]: { __typename: 'IdResponse', id: 'x' } });
const refused = (
  field: string,
  wrapper: string,
  errorType: string,
  description: string
) =>
  success({
    [field]: {
      __typename: wrapper,
      error: { __typename: errorType, description },
    },
  });
const untyped = (details?: string) =>
  ({
    kind: 'graphqlError',
    message: 'Bad user input',
    errors: [
      { message: 'Bad user input', extensions: details ? { details } : {} },
    ],
  }) as never;

beforeEach(() => fetchMock.mockReset());

describe('updatePurchaseOrder', () => {
  it('sends {storeId, input} and asks for the untyped errors back', async () => {
    fetchMock.mockResolvedValue(saved('updatePurchaseOrder'));
    const result = await updatePurchaseOrder('s1', {
      id: 'po-1',
      comment: 'c',
    });
    expect(result).toEqual({ kind: 'saved' });
    expect(fetchMock.mock.calls[0]?.slice(1)).toEqual([
      { storeId: 's1', input: { id: 'po-1', comment: 'c' } },
      { returnGraphqlErrors: true },
    ]);
  });

  it('names the blocked lines from ItemsCannotBeOrdered', async () => {
    fetchMock.mockResolvedValue(
      success({
        updatePurchaseOrder: {
          __typename: 'UpdatePurchaseOrderError',
          error: {
            __typename: 'ItemsCannotBeOrdered',
            description: 'Items cannot be ordered',
            lines: [{ line: { id: 'l1' } }, { line: { id: 'l3' } }],
          },
        },
      })
    );
    expect(
      await updatePurchaseOrder('s1', { id: 'po-1', status: 'SENT' })
    ).toEqual({
      kind: 'error',
      message: 'Items cannot be ordered',
      blockedLines: ['l1', 'l3'],
    });
  });

  it('reports the other typed refusal with no lines to mark', async () => {
    fetchMock.mockResolvedValue(
      refused(
        'updatePurchaseOrder',
        'UpdatePurchaseOrderError',
        'InboundShipmentsNotVerified',
        'Shipments not verified'
      )
    );
    expect(
      await updatePurchaseOrder('s1', { id: 'po-1', status: 'FINALISED' })
    ).toEqual({
      kind: 'error',
      message: 'Shipments not verified',
      blockedLines: undefined,
    });
  });

  it('translates an untyped refusal from the Rust variant in extensions.details', async () => {
    fetchMock.mockResolvedValue(untyped('CannotEditSentPurchaseOrder'));
    expect(
      await updatePurchaseOrder('s1', { id: 'po-1', reference: 'r' })
    ).toEqual({ kind: 'error', message: 'Cannot Edit Sent Purchase Order' });
  });

  it('falls back to the bare GraphQL message when no variant is carried', async () => {
    fetchMock.mockResolvedValue(untyped());
    expect(
      await updatePurchaseOrder('s1', { id: 'po-1', reference: 'r' })
    ).toEqual({ kind: 'error', message: 'Bad user input' });
  });

  it('reports a transport failure as failed, with nothing to say', async () => {
    fetchMock.mockResolvedValue({ kind: 'unauthenticated' } as never);
    expect(await updatePurchaseOrder('s1', { id: 'po-1' })).toEqual({
      kind: 'failed',
    });
  });
});

describe('deletePurchaseOrderLines', () => {
  it('counts the deletions and keeps the first refusal beside them', async () => {
    fetchMock.mockResolvedValue(
      success({
        deletePurchaseOrderLines: [
          { id: 'l1', response: { __typename: 'DeleteResponse', id: 'l1' } },
          {
            id: 'l2',
            response: {
              __typename: 'DeletePurchaseOrderLineError',
              error: { __typename: 'RecordNotFound', description: 'gone' },
            },
          },
          { id: 'l3', response: { __typename: 'DeleteResponse', id: 'l3' } },
          {
            id: 'l4',
            response: {
              __typename: 'DeletePurchaseOrderLineError',
              error: { __typename: 'RecordNotFound', description: 'also gone' },
            },
          },
        ],
      })
    );
    expect(
      await deletePurchaseOrderLines('s1', ['l1', 'l2', 'l3', 'l4'])
    ).toEqual({ applied: 2, message: 'gone' });
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      storeId: 's1',
      ids: ['l1', 'l2', 'l3', 'l4'],
    });
  });

  it('reads the untyped state gate as nothing applied', async () => {
    fetchMock.mockResolvedValue(untyped('CannotEditPurchaseOrder'));
    expect(await deletePurchaseOrderLines('s1', ['l1'])).toEqual({
      applied: 0,
      message: 'Cannot Edit Purchase Order',
    });
  });
});

describe('closePurchaseOrderLines', () => {
  it('issues one CLOSED write per line and a refusal does not stop the rest', async () => {
    fetchMock
      .mockResolvedValueOnce(saved('updatePurchaseOrderLine'))
      .mockResolvedValueOnce(
        refused(
          'updatePurchaseOrderLine',
          'UpdatePurchaseOrderLineError',
          'RecordNotFound',
          'gone'
        )
      )
      .mockResolvedValueOnce(saved('updatePurchaseOrderLine'));
    expect(await closePurchaseOrderLines('s1', ['l1', 'l2', 'l3'])).toEqual({
      applied: 2,
      message: 'gone',
    });
    expect(fetchMock.mock.calls.map(call => call[1])).toEqual([
      { storeId: 's1', input: { id: 'l1', status: 'CLOSED' } },
      { storeId: 's1', input: { id: 'l2', status: 'CLOSED' } },
      { storeId: 's1', input: { id: 'l3', status: 'CLOSED' } },
    ]);
  });
});

describe('cascadeDeliveryDates', () => {
  const lines = [{ id: 'l1' }, { id: 'l2' }];

  it('writes the given dates onto every line', async () => {
    fetchMock.mockResolvedValue(saved('updatePurchaseOrderLine'));
    expect(
      await cascadeDeliveryDates('s1', lines, '2026-02-01', [
        'requestedDeliveryDate',
        'expectedDeliveryDate',
      ])
    ).toEqual({ applied: 2, message: undefined });
    expect(fetchMock.mock.calls.map(call => call[1])).toEqual([
      {
        storeId: 's1',
        input: {
          id: 'l1',
          requestedDeliveryDate: { value: '2026-02-01' },
          expectedDeliveryDate: { value: '2026-02-01' },
        },
      },
      {
        storeId: 's1',
        input: {
          id: 'l2',
          requestedDeliveryDate: { value: '2026-02-01' },
          expectedDeliveryDate: { value: '2026-02-01' },
        },
      },
    ]);
  });

  it('leaves the other date untouched when not asked for it', async () => {
    fetchMock.mockResolvedValue(saved('updatePurchaseOrderLine'));
    await cascadeDeliveryDates('s1', lines, '2026-02-01', [
      'requestedDeliveryDate',
    ]);
    expect(fetchMock.mock.calls.map(call => call[1])).toEqual([
      {
        storeId: 's1',
        input: { id: 'l1', requestedDeliveryDate: { value: '2026-02-01' } },
      },
      {
        storeId: 's1',
        input: { id: 'l2', requestedDeliveryDate: { value: '2026-02-01' } },
      },
    ]);
  });

  it('carries the first refusal so the field can report it', async () => {
    fetchMock
      .mockResolvedValueOnce(untyped('CannotEditSentPurchaseOrder'))
      .mockResolvedValueOnce(saved('updatePurchaseOrderLine'));
    expect(
      await cascadeDeliveryDates('s1', lines, '2026-04-01', [
        'expectedDeliveryDate',
      ])
    ).toEqual({ applied: 1, message: 'Cannot Edit Sent Purchase Order' });
  });
});

describe('cascadedDateFields', () => {
  const agreeing = [
    { requestedDeliveryDate: '2026-01-01', expectedDeliveryDate: null },
    { requestedDeliveryDate: '2026-01-01', expectedDeliveryDate: null },
  ];
  const expectedDiffer = [
    { requestedDeliveryDate: '2026-01-01', expectedDeliveryDate: '2026-02-01' },
    { requestedDeliveryDate: '2026-01-01', expectedDeliveryDate: '2026-02-09' },
  ];

  it('carries the other date along while the lines agree on it', () => {
    expect(cascadedDateFields(agreeing, 'requestedDeliveryDate')).toEqual([
      'requestedDeliveryDate',
      'expectedDeliveryDate',
    ]);
    expect(cascadedDateFields(agreeing, 'expectedDeliveryDate')).toEqual([
      'expectedDeliveryDate',
      'requestedDeliveryDate',
    ]);
  });

  it('leaves per-line values of the other date alone once they differ', () => {
    expect(cascadedDateFields(expectedDiffer, 'requestedDeliveryDate')).toEqual(
      ['requestedDeliveryDate']
    );
  });
});

describe('deliveryDatesVary', () => {
  it('is false for no lines, or lines that all agree on the field', () => {
    expect(deliveryDatesVary([], 'expectedDeliveryDate')).toBe(false);
    expect(
      deliveryDatesVary(
        [
          { expectedDeliveryDate: '2026-03-01' },
          { expectedDeliveryDate: '2026-03-01' },
        ],
        'expectedDeliveryDate'
      )
    ).toBe(false);
    expect(
      deliveryDatesVary(
        [{ requestedDeliveryDate: null }, { requestedDeliveryDate: undefined }],
        'requestedDeliveryDate'
      )
    ).toBe(false);
  });

  it('is true for two dates, or a date beside a line with none', () => {
    expect(
      deliveryDatesVary(
        [
          { requestedDeliveryDate: '2026-03-01' },
          { requestedDeliveryDate: '2026-03-02' },
        ],
        'requestedDeliveryDate'
      )
    ).toBe(true);
    expect(
      deliveryDatesVary(
        [
          { expectedDeliveryDate: '2026-03-01' },
          { expectedDeliveryDate: null },
        ],
        'expectedDeliveryDate'
      )
    ).toBe(true);
  });

  it('reads only the field asked about', () => {
    expect(
      deliveryDatesVary(
        [
          { requestedDeliveryDate: '2026-03-01', expectedDeliveryDate: 'a' },
          { requestedDeliveryDate: '2026-03-01', expectedDeliveryDate: 'b' },
        ],
        'requestedDeliveryDate'
      )
    ).toBe(false);
  });
});
