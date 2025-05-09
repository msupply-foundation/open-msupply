import {
  create,
  DateUtils,
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
  Units = 'Units',
  // Actually handling doses in upcoming PR
  Doses = 'Doses',
  // Not allocating in packs, at least for now, many use cases to cover
}

interface AllocationContext {
  draftStockOutLines: DraftStockOutLine[];
  allocatedUnits: number;
  alerts: StockOutAlert[];
  allocateIn: AllocateIn;
  isAutoAllocated: boolean;

  // TODO - is it performant? could do by id, then return array if needed?
  setDraftStockOutLines: (lines: DraftStockOutLine[]) => void;
  manualAllocate: (lineId: string, quantity: number) => void;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>,
    allowPlaceholder?: boolean
  ) => void;
  initialise: (lines: DraftStockOutLine[]) => void;
}

// TODO - possibly should scope to the modal?
export const useAllocationContext = create<AllocationContext>((set, get) => ({
  draftStockOutLines: [],
  alerts: [],
  allocatedUnits: 0,
  allocateIn: AllocateIn.Units,
  isAutoAllocated: false,
  initialise: lines => {
    set({
      draftStockOutLines: lines,
      allocatedUnits: getAllocatedQuantity(lines),
      alerts: [],
      isAutoAllocated: false,
    });
  },
  setDraftStockOutLines: lines =>
    set(state => ({
      ...state,
      draftStockOutLines: lines,
      allocatedUnits: getAllocatedQuantity(lines),
    })),
  autoAllocate: (quantity, format, t, allowPlaceholder = false) => {
    const { draftStockOutLines, setDraftStockOutLines } = get();
    const updatedLines = allocateQuantities(
      draftStockOutLines,
      quantity,
      allowPlaceholder
    );

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
        quantity,
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
}));
