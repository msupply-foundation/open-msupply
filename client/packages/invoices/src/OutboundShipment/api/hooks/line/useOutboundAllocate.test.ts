import {
  AllocationResult,
  mapResult,
} from './useOutboundAllocateSelectedLines';
describe('mapResult', () => {
  it('counts successful allocations', () => {
    const apiResult = [
      // delete = fully allocated
      makeResponse({ id: 'test-id-1', withDelete: true }),
      makeResponse({ id: 'test-id-2', withDelete: true }),
      makeResponse({ id: 'test-id-3', withDelete: true }),
      makeResponse({ id: 'test-id-4' }),
    ];
    const mapped = mapResult(apiResult);
    expect(mapped.success).toBe(3);
  });

  describe('partial allocations', () => {
    it('counts as partial when new line is created', () => {
      const apiResult = [
        makeResponse({ id: 'test-id-1', insertCount: 2 }),
        makeResponse({ id: 'test-id-2', insertCount: 1 }),
        // ensure fully allocated lines are not counted
        makeResponse({ id: 'test-id-3', insertCount: 1, withDelete: true }),
      ];
      const mapped = mapResult(apiResult);
      expect(mapped.partial.count).toBe(2);
    });

    it('counts as partial when existing line is updated', () => {
      const apiResult = [
        makeResponse({ id: 'test-id-1', updateCount: 2 }),
        // Don't count only 1 line updated, this is the placeholder line (doesn't mean any more stock was allocated)
        makeResponse({ id: 'test-id-2', updateCount: 1 }),
        // ensure fully allocated lines are not counted
        makeResponse({ id: 'test-id-3', updateCount: 1, withDelete: true }),
      ];
      const mapped = mapResult(apiResult);
      expect(mapped.partial.count).toBe(1);
    });
  });

  it('counts failed allocations', () => {
    const apiResult = [makeResponse({ id: 'test-id-1' })];
    const mapped = mapResult(apiResult);
    expect(mapped.failed.count).toBe(1);
  });

  it('includes reasons for unallocated lines', () => {
    const apiResult = [
      // partial
      makeResponse({
        id: '1',
        insertCount: 1,
        expiredCount: 1,
      }),
      // partial
      makeResponse({
        id: '2',
        updateCount: 2,
        expiredCount: 1,
        onHoldCount: 1,
      }),
      // fail
      makeResponse({
        id: '3',
        updateCount: 1,
        unusableVvmStatusCount: 1,
      }),
    ];
    const mapped = mapResult(apiResult);
    expect(mapped.partial.count).toBe(2);
    expect(mapped.partial.unallocatedReasonKeys).toEqual(
      new Set(['label.expired', 'label.on-hold'])
    );
    expect(mapped.failed.count).toBe(1);
    expect(mapped.failed.unallocatedReasonKeys).toEqual(
      new Set(['label.unusable-vvm-status'])
    );
  });
});

const makeResponse = ({
  id,
  withDelete = false,
  insertCount = 0,
  updateCount = 0,
  expiredCount = 0,
  onHoldCount = 0,
  unusableVvmStatusCount = 0,
}: {
  id: string;
  withDelete?: boolean;
  insertCount?: number;
  updateCount?: number;
  expiredCount?: number;
  onHoldCount?: number;
  unusableVvmStatusCount?: number;
}): AllocationResult => {
  return {
    __typename: 'AllocateOutboundShipmentUnallocatedLineResponseWithId',
    id,
    response: {
      __typename: 'AllocateOutboundShipmentUnallocatedLineNode',
      deletes: withDelete ? [{ __typename: 'DeleteResponse', id }] : [],
      updates: {
        __typename: 'InvoiceLineConnector',
        totalCount: updateCount,
      },
      inserts: {
        __typename: 'InvoiceLineConnector',
        totalCount: insertCount,
      },
      skippedExpiredStockLines: {
        __typename: 'StockLineConnector',
        totalCount: expiredCount,
      },
      skippedOnHoldStockLines: {
        __typename: 'StockLineConnector',
        totalCount: onHoldCount,
      },
      skippedUnusableVvmStatusLines: {
        __typename: 'StockLineConnector',
        totalCount: unusableVvmStatusCount,
      },
    },
  };
};
