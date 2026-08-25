import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlFetch } from '../../../api/graphql';
import { changeShipmentCurrency, changeShipmentStatus } from './outboundUpdate';

// The status/currency wire mappings (contract § header fields,
// OMS-REG-DIST-02.10/.27, ui-surface § Foreign currency): what goes ON the wire
// (the one-save release-and-advance input) and how each typed verdict comes
// back off it. graphqlFetch is mocked at the module seam — these functions ARE
// the response mapping, so the mock's shape is the test subject's input.

vi.mock('../../../api/graphql', () => ({
  graphqlFetch: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

// Minimal wire payloads: only the fields the mapping reads. The cast is the
// test's trusted seam (the real shapes are codegen-validated end to end).
const success = (updateOutboundShipment: unknown) =>
  ({ kind: 'success', data: { updateOutboundShipment } }) as never;

beforeEach(() => fetchMock.mockReset());

describe('changeShipmentStatus', () => {
  it('sends {id, status} only by default', async () => {
    fetchMock.mockResolvedValue(
      success({ __typename: 'InvoiceNode', id: 'i1' })
    );
    const result = await changeShipmentStatus('s1', 'i1', 'ALLOCATED');
    expect(result.kind).toBe('saved');
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      storeId: 's1',
      input: { id: 'i1', status: 'ALLOCATED' },
    });
  });

  it('OMS-REG-DIST-02.27: releaseHold sends the ONE-save {id, status, onHold: false}', async () => {
    fetchMock.mockResolvedValue(
      success({ __typename: 'InvoiceNode', id: 'i1' })
    );
    await changeShipmentStatus('s1', 'i1', 'PICKED', true);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      storeId: 's1',
      input: { id: 'i1', status: 'PICKED', onHold: false },
    });
  });

  it('OMS-REG-DIST-02.10: the on-hold rejection arms the release retry (heldShipment)', async () => {
    fetchMock.mockResolvedValue(
      success({
        __typename: 'UpdateOutboundShipmentError',
        error: {
          __typename: 'CannotChangeStatusOfInvoiceOnHold',
          description: 'on hold',
        },
      })
    );
    const result = await changeShipmentStatus('s1', 'i1', 'ALLOCATED');
    expect(result).toEqual({
      kind: 'error',
      // No dictionary is loaded in this test file, so t() falls back to the
      // key — which is exactly the assertion: the on-hold verdict maps to
      // the on-hold message, not the raw description.
      message: 'messages.on-hold-outbound',
      unallocatedItems: [],
      heldShipment: true,
    });
  });

  it('OMS-REG-DIST-03.9: the unallocated-lines rejection carries the offending items', async () => {
    fetchMock.mockResolvedValue(
      success({
        __typename: 'UpdateOutboundShipmentError',
        error: {
          __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines',
          description: 'unallocated',
          invoiceLines: { nodes: [{ itemName: 'Amox' }, { itemName: 'Para' }] },
        },
      })
    );
    const result = await changeShipmentStatus('s1', 'i1', 'ALLOCATED');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.unallocatedItems).toEqual(['Amox', 'Para']);
      expect(result.heldShipment).toBeUndefined();
    }
  });

  it('NodeError and a failed fetch both map to failed', async () => {
    fetchMock.mockResolvedValue(
      success({ __typename: 'NodeError', error: { description: 'gone' } })
    );
    expect((await changeShipmentStatus('s1', 'i1', 'PICKED')).kind).toBe(
      'failed'
    );
    fetchMock.mockResolvedValue({ kind: 'error' } as never);
    expect((await changeShipmentStatus('s1', 'i1', 'PICKED')).kind).toBe(
      'failed'
    );
  });
});

describe('changeShipmentCurrency', () => {
  it('passes the currency + rate through and returns the saved node', async () => {
    fetchMock.mockResolvedValue(
      success({ __typename: 'InvoiceNode', id: 'i1' })
    );
    const result = await changeShipmentCurrency('s1', {
      id: 'i1',
      currencyId: 'usd',
      currencyRate: 1.5,
    });
    expect(result.kind).toBe('saved');
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({
      storeId: 's1',
      input: { id: 'i1', currencyId: 'usd', currencyRate: 1.5 },
    });
  });

  it('a typed rejection surfaces its description inline (the modal shows it)', async () => {
    fetchMock.mockResolvedValue(
      success({
        __typename: 'UpdateOutboundShipmentError',
        error: {
          __typename: 'CannotIssueInForeignCurrency',
          description: 'Cannot issue in foreign currency',
        },
      })
    );
    expect(
      await changeShipmentCurrency('s1', {
        id: 'i1',
        currencyId: 'usd',
        currencyRate: 1,
      })
    ).toEqual({ kind: 'error', message: 'Cannot issue in foreign currency' });
  });

  it('NodeError and a failed fetch both map to failed', async () => {
    fetchMock.mockResolvedValue(
      success({ __typename: 'NodeError', error: { description: 'gone' } })
    );
    expect(
      (
        await changeShipmentCurrency('s1', {
          id: 'i1',
          currencyId: 'usd',
          currencyRate: 1,
        })
      ).kind
    ).toBe('failed');
    fetchMock.mockResolvedValue({ kind: 'error' } as never);
    expect(
      (
        await changeShipmentCurrency('s1', {
          id: 'i1',
          currencyId: 'usd',
          currencyRate: 1,
        })
      ).kind
    ).toBe('failed');
  });
});
