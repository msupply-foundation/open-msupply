import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  graphqlFetch,
  isForbidden,
  reportPermissionDenied,
} from '@/api/graphql';
import { deleteInboundShipments } from './deleteInboundShipments';
import type { InboundScope } from '../inboundShipmentScope';

// The list bulk delete's WIRE SPLIT (OMS-REG-REPL-01.33/.34, contract §
// permissions → mutating). The batch mutation is twinned per scope, so what is
// under test is which twin each id is sent to and how a refusal in one scope
// reads once the other has committed. graphqlFetch is mocked at the module
// seam — the mock's shape is the subject's input.

// The invoice domain module's curated barrel also carries its shared modals,
// which reach Kobalte and cannot load in the node test environment. Take the
// one function the subject uses from its own module instead — the real one, so
// a refusal is still read the way production reads it.
vi.mock('@/domain/invoice', async () => ({
  deleteRejection: (
    await vi.importActual<typeof import('@/domain/invoice/deleteRejection')>(
      '@/domain/invoice/deleteRejection'
    )
  ).deleteRejection,
}));

vi.mock('@/api/graphql', () => ({
  graphqlFetch: vi.fn(),
  isForbidden: vi.fn(() => false),
  missingPermissions: vi.fn(() => []),
  reportPermissionDenied: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);
const forbiddenMock = vi.mocked(isForbidden);
const deniedMock = vi.mocked(reportPermissionDenied);

const plain = (id: string) => ({ id, scope: 'INBOUND_SHIPMENT' as const });
const external = (id: string) => ({
  id,
  scope: 'INBOUND_SHIPMENT_EXTERNAL' as const,
});

// Minimal wire payloads: only what the fold reads. The cast is the test's
// trusted seam (the real shapes are codegen-validated end to end).
const deleted = (...ids: string[]) =>
  ({
    kind: 'success',
    data: {
      batchInboundShipment: {
        deleteInboundShipments: ids.map(id => ({
          id,
          response: { __typename: 'DeleteResponse', id },
        })),
      },
    },
  }) as never;

const deletedExternal = (...ids: string[]) =>
  ({
    kind: 'success',
    data: {
      batchInboundShipmentExternal: {
        deleteInboundShipments: ids.map(id => ({
          id,
          response: { __typename: 'DeleteResponse', id },
        })),
      },
    },
  }) as never;

// One typed refusal alongside a sibling that reported success: the batch is
// all-or-nothing, so NOTHING in it went.
const refusedExternal = (description: string) =>
  ({
    kind: 'success',
    data: {
      batchInboundShipmentExternal: {
        deleteInboundShipments: [
          { id: 'a', response: { __typename: 'DeleteResponse', id: 'a' } },
          {
            id: 'b',
            response: {
              __typename: 'DeleteInboundShipmentError',
              error: { __typename: 'CannotDeleteInvoice', description },
            },
          },
        ],
      },
    },
  }) as never;

// Which twin a call went to, read off the document it was given.
const twinOf = (call: number): InboundScope =>
  String(fetchMock.mock.calls[call]?.[0]?.query).includes(
    'batchInboundShipmentExternal'
  )
    ? 'INBOUND_SHIPMENT_EXTERNAL'
    : 'INBOUND_SHIPMENT';
const idsOf = (call: number) =>
  (fetchMock.mock.calls[call]?.[1] as { ids: { id: string }[] } | undefined)
    ?.ids;

beforeEach(() => {
  fetchMock.mockReset();
  forbiddenMock.mockReset();
  forbiddenMock.mockReturnValue(false);
  deniedMock.mockReset();
});

describe('deleteInboundShipments', () => {
  it('sends a plain-only selection to the plain twin, in one batch', async () => {
    fetchMock.mockResolvedValue(deleted('a', 'b'));
    const outcome = await deleteInboundShipments('s1', [
      plain('a'),
      plain('b'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(twinOf(0)).toBe('INBOUND_SHIPMENT');
    expect(idsOf(0)).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(outcome).toEqual({ deleted: 2, result: { kind: 'ok' } });
  });

  it('sends a PO-linked-only selection to the external twin — no plain call', async () => {
    fetchMock.mockResolvedValue(deletedExternal('a'));
    const outcome = await deleteInboundShipments('s1', [external('a')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(twinOf(0)).toBe('INBOUND_SHIPMENT_EXTERNAL');
    expect(outcome).toEqual({ deleted: 1, result: { kind: 'ok' } });
  });

  it('.33: a mixed selection goes as one batch PER SCOPE, plain first, each carrying only its own ids', async () => {
    fetchMock
      .mockResolvedValueOnce(deleted('a', 'c'))
      .mockResolvedValueOnce(deletedExternal('b'));
    const outcome = await deleteInboundShipments('s1', [
      plain('a'),
      external('b'),
      plain('c'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(twinOf(0)).toBe('INBOUND_SHIPMENT');
    expect(idsOf(0)).toEqual([{ id: 'a' }, { id: 'c' }]);
    expect(twinOf(1)).toBe('INBOUND_SHIPMENT_EXTERNAL');
    expect(idsOf(1)).toEqual([{ id: 'b' }]);
    expect(outcome).toEqual({ deleted: 3, result: { kind: 'ok' } });
  });

  it('.34: a refusal in the second scope reports the reason AND what the first scope deleted', async () => {
    fetchMock
      .mockResolvedValueOnce(deleted('a'))
      .mockResolvedValueOnce(refusedExternal('Cannot delete invoice'));
    const outcome = await deleteInboundShipments('s1', [
      plain('a'),
      external('b'),
    ]);
    expect(outcome).toEqual({
      deleted: 1,
      result: { kind: 'refused', message: 'Cannot delete invoice' },
    });
  });

  it('.21: a batch is all-or-nothing — a typed refusal removes nothing in it, whatever its siblings reported', async () => {
    fetchMock.mockResolvedValue(refusedExternal('Cannot delete invoice'));
    const outcome = await deleteInboundShipments('s1', [external('b')]);
    expect(outcome).toEqual({
      deleted: 0,
      result: { kind: 'refused', message: 'Cannot delete invoice' },
    });
  });

  it('stops at the first refusal rather than stacking a second rejection', async () => {
    fetchMock.mockResolvedValueOnce({
      kind: 'graphqlError',
      errors: [{ message: 'nope' }],
    } as never);
    const outcome = await deleteInboundShipments('s1', [
      plain('a'),
      external('b'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(outcome.deleted).toBe(0);
    expect(outcome.result.kind).toBe('refused');
  });

  it('routes a Forbidden scope to the global permission-denied modal, not an inline refusal', async () => {
    forbiddenMock.mockReturnValue(true);
    fetchMock.mockResolvedValueOnce(deleted('a')).mockResolvedValueOnce({
      kind: 'graphqlError',
      errors: [{ message: 'Forbidden' }],
    } as never);
    const outcome = await deleteInboundShipments('s1', [
      plain('a'),
      external('b'),
    ]);
    expect(deniedMock).toHaveBeenCalled();
    // The plain scope still committed — the caller has to refetch on it.
    expect(outcome).toEqual({ deleted: 1, result: { kind: 'forbidden' } });
  });

  it('reports a transport failure as failed, not as a refusal', async () => {
    fetchMock.mockResolvedValue({ kind: 'error' } as never);
    const outcome = await deleteInboundShipments('s1', [plain('a')]);
    expect(outcome).toEqual({ deleted: 0, result: { kind: 'failed' } });
  });

  // The count travels with EVERY verdict, not just the refusals — a caller
  // that offers a retry has to know the earlier batch already committed.
  it('carries the committed count through a transport failure in the second scope', async () => {
    fetchMock
      .mockResolvedValueOnce(deleted('a'))
      .mockResolvedValueOnce({ kind: 'error' } as never);
    const outcome = await deleteInboundShipments('s1', [
      plain('a'),
      external('b'),
    ]);
    expect(outcome).toEqual({ deleted: 1, result: { kind: 'failed' } });
  });

  it('sends nothing for an empty selection', async () => {
    const outcome = await deleteInboundShipments('s1', []);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ deleted: 0, result: { kind: 'ok' } });
  });
});
