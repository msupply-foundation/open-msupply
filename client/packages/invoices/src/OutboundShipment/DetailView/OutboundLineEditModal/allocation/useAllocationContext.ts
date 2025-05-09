import {
  create,
  DateUtils,
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

export const ALLOCATE_IN_UNITS = -1;
export const ALLOCATE_IN_DOSES = -2;

interface AllocationContext {
  draftStockOutLines: DraftStockOutLine[];
  allocatedUnits: number;
  alerts: StockOutAlert[];
  allocateIn: number;
  isAutoAllocated: boolean;

  // TODO - is it performant? could do by id, then return array if needed?
  setDraftStockOutLines: (lines: DraftStockOutLine[]) => void;
  // Pack size for allocation. -1 for units, -2 for doses
  setAllocateIn: (allocateIn: number) => void;
  manualAllocate: (lineId: string, quantity: number) => void;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;
  initialise: (lines: DraftStockOutLine[]) => void;
}

// TODO - possibly should scope to the modal?
export const useAllocationContext = create<AllocationContext>((set, get) => {
  return {
    draftStockOutLines: [],
    alerts: [],
    allocatedUnits: 0,
    allocateIn: ALLOCATE_IN_UNITS,
    isAutoAllocated: false,
    initialise: lines =>
      set({
        draftStockOutLines: lines,
        allocatedUnits: getAllocatedQuantity(lines),
        alerts: [],
        allocateIn: ALLOCATE_IN_UNITS, // todo... should be based on selected stuff.
        isAutoAllocated: false,
      }),
    setAllocateIn: allocateIn => {
      set(state => ({
        ...state,
        allocateIn,
        // Update allocated quan by in type
      }));
      const { draftStockOutLines, setDraftStockOutLines } = get();
      // TODO - update allocate to accept allowPlaceholder
      const applyAllocation = allocateQuantities(
        InvoiceNodeStatus.Allocated, // should be false
        draftStockOutLines
      );

      // todo make nice lol
      if (
        allocateIn !== ALLOCATE_IN_UNITS &&
        draftStockOutLines
          .filter(l => l.numberOfPacks > 0)
          .some(l => l.packSize !== allocateIn)
      ) {
        const updatedLines = applyAllocation(0, null);
        if (updatedLines) setDraftStockOutLines(updatedLines);
      }
    },
    setDraftStockOutLines: lines =>
      set(state => ({
        ...state,
        draftStockOutLines: lines,
        allocatedUnits: getAllocatedQuantity(lines),
      })),
    autoAllocate: (quantity, format, t, allowPlaceholder = false) => {
      const { draftStockOutLines, setDraftStockOutLines, allocateIn } = get();
      // TODO - update allocate to accept allowPlaceholder
      const applyAllocation = allocateQuantities(
        allowPlaceholder ? InvoiceNodeStatus.New : InvoiceNodeStatus.Allocated,
        draftStockOutLines
      );

      const allocatePackSize =
        allocateIn === ALLOCATE_IN_UNITS ? null : allocateIn;

      const updatedLines = applyAllocation(quantity, allocatePackSize);

      if (updatedLines) {
        setDraftStockOutLines(updatedLines);

        const placeholderLine = updatedLines?.find(isA.placeholderLine);
        const allocatedUnits = getAllocatedQuantity(updatedLines);

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
          quantity * (allocateIn === ALLOCATE_IN_UNITS ? 1 : allocateIn),
          allocatedUnits,
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
      }
    },
    manualAllocate: (lineId, quantity) => {
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
