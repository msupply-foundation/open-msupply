import {
  create,
  DateUtils,
  LocaleKey,
  SortUtils,
  TypedTFunction,
} from '@openmsupply-client/common';
import {
  getAllocationAlerts,
  StockOutAlert,
} from 'packages/invoices/src/StockOut';
import { isA } from 'packages/invoices/src/utils';
import { DraftOutboundLineFragment } from '../../../api/operations.generated';
import { allocateQuantities, getAllocatedQuantity, issueStock } from './utils';

// TODO Fix imports

export enum AllocateIn {
  Units = 'Units',
  // Actually handling doses in upcoming PR
  Doses = 'Doses',
  // Not allocating in packs, at least for now, many use cases to cover
}

interface AllocationContext {
  draftLines: DraftOutboundLineFragment[];
  allocatedUnits: number;
  alerts: StockOutAlert[];
  allocateIn: AllocateIn;
  isAutoAllocated: boolean;
  initialisedForItemId: string | null;
  placeholderLine: DraftOutboundLineFragment | null;

  initialise: (itemId: string, lines: DraftOutboundLineFragment[]) => void;
  setDraftLines: (lines: DraftOutboundLineFragment[]) => void;
  manualAllocate: (lineId: string, quantity: number) => void;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>,
    allowPlaceholder?: boolean
  ) => void;
}

// TODO - possibly should scope to the modal?
export const useAllocationContext = create<AllocationContext>((set, get) => ({
  initialisedForItemId: null,
  draftLines: [],
  placeholderLine: null,
  alerts: [],
  allocatedUnits: 0,
  allocateIn: AllocateIn.Units,
  isAutoAllocated: false,

  initialise: (itemId, lines) => {
    const placeholderLine = lines.find(isA.placeholderLine);
    const nonPlaceholderLines = lines.filter(
      line => !isA.placeholderLine(line)
    );
    set({
      initialisedForItemId: itemId,
      draftLines: nonPlaceholderLines.sort(SortUtils.byExpiryAsc),
      placeholderLine,
      allocatedUnits: getAllocatedQuantity(lines),
      alerts: [],
      isAutoAllocated: false,
    });
  },

  setDraftLines: lines =>
    set(state => ({
      ...state,
      draftLines: lines,
      allocatedUnits: getAllocatedQuantity(lines),
    })),

  autoAllocate: (quantity, format, t, allowPlaceholder = false) => {
    const { draftLines, setDraftLines } = get();
    const updatedLines = allocateQuantities(
      draftLines,
      quantity,
      allowPlaceholder
    );

    if (updatedLines) {
      setDraftLines(updatedLines);

      const placeholderLine = updatedLines?.find(isA.placeholderLine);
      const allocatedUnits = getAllocatedQuantity(updatedLines);

      // TODO - alerts handled sep
      const hasOnHold = draftLines.some(
        ({ availablePacks, stockLineOnHold }) =>
          availablePacks > 0 && !!stockLineOnHold
      );
      const hasExpired = draftLines.some(
        ({ availablePacks, expiryDate }) =>
          availablePacks > 0 &&
          !!expiryDate &&
          DateUtils.isExpired(new Date(expiryDate))
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
    const { draftLines, setDraftLines } = get();

    const updatedLines = issueStock(draftLines, lineId, quantity);

    setDraftLines(updatedLines);

    // TODO = update the placeholder

    set(state => ({
      ...state,
      isAutoAllocated: false,
      alerts: [],
    }));
  },
}));
