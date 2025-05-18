import {
  ArrayUtils,
  create,
  DateUtils,
  LocaleKey,
  SortUtils,
  TypedTFunction,
} from '@openmsupply-client/common';
import { getAllocationAlerts, StockOutAlert } from '../../../../StockOut';
import { DraftStockOutLineFragment } from '../../../api/operations.generated';
import {
  canAllocate,
  getAllocatedUnits,
  issueStock,
  scannedBatchFilter,
} from './utils';
import { OutboundLineEditData } from '../../../api';
import { allocateQuantities } from './allocateQuantities';
import { DraftItem } from '../../../..';

export enum AllocateIn {
  Units = 'Units',
  // Actually handling doses in upcoming PR
  Doses = 'Doses',
  // Not allocating in packs, at least for now, many use cases to cover
}

export enum AllocationStrategy {
  FEFO = 'FEFO',
  // VVMStatus = 'VVMStatus',
}

const SorterByStrategy = {
  [AllocationStrategy.FEFO]: SortUtils.byExpiryAscNonExpiringLast,
};

interface AllocationContext {
  isDirty: boolean;
  draftLines: DraftStockOutLineFragment[];
  /** Lines which cannot be allocated from, but should be shown to the user */
  nonAllocatableLines: DraftStockOutLineFragment[];
  alerts: StockOutAlert[];
  allocateIn: AllocateIn;
  item: DraftItem | null;
  placeholderQuantity: number | null;

  initialise: (
    input: OutboundLineEditData,
    strategy: AllocationStrategy,
    withPlaceholder: boolean,
    scannedBatch?: string
  ) => void;

  setAlerts: (alerts: StockOutAlert[]) => void;
  clear: () => void;

  manualAllocate: (lineId: string, quantity: number) => void;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;
}

export const useAllocationContext = create<AllocationContext>((set, get) => ({
  isDirty: false,
  item: null,
  draftLines: [],
  nonAllocatableLines: [],
  placeholderQuantity: null,
  alerts: [],
  allocateIn: AllocateIn.Units,

  initialise: (
    { item, draftLines, placeholderQuantity },
    strategy,
    allowPlaceholder,
    scannedBatch?: string
  ) => {
    const sortedLines = draftLines.sort(SorterByStrategy[strategy]);

    // Separate lines here, so only dealing with allocatable lines going forward
    // Note - expired is still considered allocatable, just not via auto-allocation
    const [allocatableLines, nonAllocatableLines] = ArrayUtils.partition(
      sortedLines,
      line => {
        return (
          canAllocate(line) &&
          (!scannedBatch || scannedBatchFilter(sortedLines, line, scannedBatch))
        );
      }
    );

    set({
      isDirty: false,
      item,

      draftLines: allocatableLines,
      nonAllocatableLines,

      placeholderQuantity: allowPlaceholder ? (placeholderQuantity ?? 0) : null,
      alerts: [],
    });
  },

  clear: () =>
    set(state => ({
      ...state,
      isDirty: false,
      draftLines: [],
      nonAllocatableLines: [],
      placeholderQuantity: null,
      item: null,
      allocateIn: AllocateIn.Units,
      alerts: [],
    })),

  setAlerts: alerts =>
    set(state => ({
      ...state,
      alerts,
    })),

  autoAllocate: (quantity, format, t) => {
    const { draftLines, nonAllocatableLines, placeholderQuantity } = get();

    const result = allocateQuantities(draftLines, quantity);

    if (result) {
      const allocatedUnits = getAllocatedUnits({
        draftLines: result.allocatedLines,
        placeholderQuantity: 0, // don't want to include any placeholder in this calc
      });

      const hasOnHold = nonAllocatableLines.some(
        ({ availablePacks, stockLineOnHold }) =>
          availablePacks > 0 && !!stockLineOnHold
      );
      const hasExpired = draftLines.some(
        ({ expiryDate }) =>
          !!expiryDate && DateUtils.isExpired(new Date(expiryDate))
      );

      const stillToAllocate =
        result.remainingQuantity > 0 ? result.remainingQuantity : 0;

      const alerts = getAllocationAlerts(
        quantity,
        allocatedUnits,
        stillToAllocate,
        hasOnHold,
        hasExpired,
        format,
        t
      );

      set(state => ({
        ...state,
        isDirty: true,
        draftLines: result.allocatedLines,
        alerts,
        placeholderQuantity:
          placeholderQuantity === null ? null : stillToAllocate,
      }));
    }
  },

  manualAllocate: (lineId, quantity) => {
    const { draftLines } = get();

    const updatedLines = issueStock(draftLines, lineId, quantity);

    set(state => ({
      ...state,
      isDirty: true,
      draftLines: updatedLines,
      alerts: [],
    }));
  },
}));
