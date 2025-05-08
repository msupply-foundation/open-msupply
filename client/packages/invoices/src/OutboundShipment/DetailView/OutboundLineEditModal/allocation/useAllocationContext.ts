import {
  create,
  // RecordWithId,
  // keyBy,
  // mapValues,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import {
  allocateQuantities,
  getAllocatedQuantity,
} from 'packages/invoices/src/StockOut';
import { DraftStockOutLine } from 'packages/invoices/src/types';
import { useDraftOutboundLines } from '..';

// TODO Fix imports

export enum AllocateIn {
  Packs = 'Packs',
  Units = 'Units',
  Doses = 'Doses',
}

interface AllocationContext {
  allocateIn: AllocateIn;
  setAllocateIn: (allocateIn: AllocateIn) => void;
  // TODO - is it performant? could do by id, then return array if needed?
  draftStockOutLines: DraftStockOutLine[];
  setDraftStockOutLines: (lines: DraftStockOutLine[]) => void;
  /**
   * Returns:
   * - Undefined if no allocation was made
   * - Otherwise, the actual quantity allocated (may differ from input quantity)
   *  */
  autoAllocate: (quantity: number) => number | void;
}

export const useAllocationContext = create<AllocationContext>((set, get) => {
  // todo her better

  return {
    draftStockOutLines: [],
    // allocatedQuantity: 0, // todo- getter only?
    allocateIn: AllocateIn.Packs, // TODO: from user pref? from store pref... also based on item?
    setAllocateIn: (allocateIn: AllocateIn) =>
      set(state => ({
        ...state,
        allocateIn,
        // Update allocated quan by in type
      })),
    setDraftStockOutLines: (lines: DraftStockOutLine[]) =>
      set(state => ({
        ...state,
        draftStockOutLines: lines,
      })),
    autoAllocate: (quantity: number, allowPlaceholder = false) => {
      const { draftStockOutLines, setDraftStockOutLines } = get();
      // TODO - update allocate to accept allowPlaceholder
      const applyAllocation = allocateQuantities(
        allowPlaceholder ? InvoiceNodeStatus.New : InvoiceNodeStatus.Allocated,
        draftStockOutLines
      );

      // TODO: this guy accepts issuePackSize, and also partial packs - null = pack 1
      const updatedLines = applyAllocation(quantity, null);

      if (updatedLines) {
        setDraftStockOutLines(updatedLines);
        return getAllocatedQuantity(updatedLines);
      }

      // TODO -
      // set is auto allocated
      // show zero quan conf?
    },
  };
});
