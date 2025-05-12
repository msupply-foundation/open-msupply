import {
  create,
  DateUtils,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import {
  getAllocationAlerts,
  StockOutAlert,
} from 'packages/invoices/src/StockOut';
import { DraftOutboundLineFragment } from '../../../api/operations.generated';
import { allocateQuantities, getAllocatedQuantity, issueStock } from './utils';
import { OutboundLineEditData } from '../../../api';

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
  placeholderQuantity: number | null;

  initialise: (input: OutboundLineEditData, withPlaceholder: boolean) => void;

  setDraftLines: (lines: DraftOutboundLineFragment[]) => void;
  manualAllocate: (lineId: string, quantity: number) => void;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;
}

// TODO - possibly should scope to the modal?
export const useAllocationContext = create<AllocationContext>((set, get) => ({
  initialisedForItemId: null,
  draftLines: [],
  placeholderQuantity: null,
  alerts: [],
  allocatedUnits: 0,
  allocateIn: AllocateIn.Units,
  isAutoAllocated: false,

  initialise: ({ item, draftLines, placeholderQuantity }, allowPlaceholder) => {
    set({
      initialisedForItemId: item.id,
      draftLines: draftLines.sort(sortByExpiry),
      placeholderQuantity: allowPlaceholder ? (placeholderQuantity ?? 0) : null,
      allocatedUnits: getAllocatedQuantity(draftLines),
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

  autoAllocate: (quantity, format, t) => {
    const { draftLines, placeholderQuantity, setDraftLines } = get();
    const result = allocateQuantities(draftLines, quantity);

    if (result) {
      setDraftLines(result.allocatedLines);

      const allocatedUnits = getAllocatedQuantity(result.allocatedLines);

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
        result.remainingQuantity,
        hasOnHold,
        hasExpired,
        format,
        t
      );

      set(state => ({
        ...state,
        isAutoAllocated: true,
        alerts,
        placeholderQuantity:
          placeholderQuantity === null ? null : result.remainingQuantity,
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

// todo - should be in sort utils
const sortByExpiry = (
  a: { expiryDate?: string | null },
  b: { expiryDate?: string | null }
) => {
  if (!a.expiryDate) return 1;
  if (!b.expiryDate) return -1;

  const expiryA = new Date(a.expiryDate);
  const expiryB = new Date(b.expiryDate);

  if (expiryA < expiryB) {
    return -1;
  }
  if (expiryA > expiryB) {
    return 1;
  }

  return 0;
};
