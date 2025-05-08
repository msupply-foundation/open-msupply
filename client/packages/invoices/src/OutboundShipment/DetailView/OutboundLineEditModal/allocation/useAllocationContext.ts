import {
  create,
  DateUtils,
  // RecordWithId,
  // keyBy,
  // mapValues,
  InvoiceNodeStatus,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import {
  allocateQuantities,
  getAllocatedQuantity,
  getAllocationAlerts,
  issueStock,
  StockOutAlert,
} from 'packages/invoices/src/StockOut';
import { DraftStockOutLine } from 'packages/invoices/src/types';
import { isA } from 'packages/invoices/src/utils';

// TODO Fix imports

export enum AllocateIn {
  Packs = 'Packs',
  Units = 'Units',
  Doses = 'Doses',
}

interface AllocationContext {
  draftStockOutLines: DraftStockOutLine[];
  allocatedQuantity: number;
  alerts: StockOutAlert[];
  allocateIn: AllocateIn;
  isAutoAllocated: boolean;

  // TODO - is it performant? could do by id, then return array if needed?
  setDraftStockOutLines: (lines: DraftStockOutLine[]) => void;
  setAllocateIn: (allocateIn: AllocateIn) => void;
  manualAllocate: (lineId: string, quantity: number) => void;
  /**
   * Returns:
   * - Undefined if no allocation was made
   * - Otherwise, the actual quantity allocated (may differ from input quantity)
   *  */
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => number | void;
}

export const useAllocationContext = create<AllocationContext>((set, get) => {
  // todo her better

  return {
    draftStockOutLines: [],
    alerts: [],
    allocatedQuantity: 0,
    allocateIn: AllocateIn.Packs, // TODO: from user pref? from store pref... also based on item?
    isAutoAllocated: false,
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
        allocatedQuantity: getAllocatedQuantity(lines),
      })),
    autoAllocate: (
      quantity: number,
      format: (value: number, options?: Intl.NumberFormatOptions) => string,
      t: TypedTFunction<LocaleKey>,
      allowPlaceholder = false
    ) => {
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

        const placeholderLine = updatedLines?.find(isA.placeholderLine);
        const allocatedQuantity = getAllocatedQuantity(updatedLines);

        // TODO
        const hasOnHold = draftStockOutLines.some(
          ({ stockLine }) =>
            (stockLine?.availableNumberOfPacks ?? 0) > 0 && !!stockLine?.onHold
        );
        const hasExpired = draftStockOutLines.some(
          ({ stockLine }) =>
            (stockLine?.availableNumberOfPacks ?? 0) > 0 &&
            !!stockLine?.expiryDate &&
            DateUtils.isExpired(new Date(stockLine?.expiryDate))
        );
        const alerts = getAllocationAlerts(
          quantity, // * (packSize === -1 ? 1 : packSize),
          allocatedQuantity,
          placeholderLine?.numberOfPacks ?? 0,
          hasOnHold,
          hasExpired,
          format,
          t
        );

        set(state => ({
          ...state,
          isAutoAllocated: true,
          alerts,
        }));

        return allocatedQuantity;
      }

      // TODO -
      // set is auto allocated
      // show zero quan conf?
    },
    manualAllocate: (lineId: string, quantity: number) => {
      const { draftStockOutLines, setDraftStockOutLines } = get();

      const updatedLines = issueStock(draftStockOutLines, lineId, quantity);

      setDraftStockOutLines(updatedLines);

      set(state => ({
        ...state,
        isAutoAllocated: false,
        alerts: [],
      }));
    },
  };
});
