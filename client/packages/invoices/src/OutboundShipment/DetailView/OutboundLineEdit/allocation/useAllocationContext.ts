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
  getAllocatedQuantity,
  issueDoses,
  issuePacks,
  packsToDoses,
  scannedBatchFilter,
} from './utils';
import { OutboundLineEditData } from '../../../api';
import { allocateQuantities } from './allocateQuantities';

/**
 * Allocation can be in units, or doses. In future, could allocate in packs too!
 *
 * Throughout allocation code & components, we use `quantity` where possible,
 * this means that piece of logic is agnostic to whether it's in units or doses.
 *
 * Where behaviour differs, we use `allocateIn` to determine use of units or doses.
 */
export enum AllocateIn {
  Units = 'Units',
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
  initialisedForItemId: string | null;
  placeholderQuantity: number | null;

  initialise: (params: {
    input: OutboundLineEditData;
    strategy: AllocationStrategy;
    allowPlaceholder: boolean;
    allocateVaccineItemsInDoses?: boolean;
    scannedBatch?: string;
  }) => void;

  setDraftLines: (lines: DraftStockOutLineFragment[]) => void;
  setAlerts: (alerts: StockOutAlert[]) => void;
  clear: () => void;

  manualAllocate: (
    lineId: string,
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => number;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => number;
}

export const useAllocationContext = create<AllocationContext>((set, get) => ({
  isDirty: false,
  initialisedForItemId: null,
  draftLines: [],
  nonAllocatableLines: [],
  placeholderQuantity: null,
  alerts: [],
  allocateIn: AllocateIn.Units,

  initialise: ({
    input: { item, draftLines, placeholderQuantity },
    strategy,
    allocateVaccineItemsInDoses,
    allowPlaceholder,
    scannedBatch,
  }) => {
    const sortedLines = draftLines.sort(SorterByStrategy[strategy]);

    // Separate lines here, so only dealing with allocatable lines going forward
    // Note - expired is still considered allocatable, just not via auto-allocation
    const [allocatableLines, nonAllocatableLines] = ArrayUtils.partition(
      sortedLines,
      line =>
        scannedBatch
          ? scannedBatchFilter(sortedLines, line, scannedBatch)
          : canAllocate(line)
    );

    set({
      isDirty: false,
      initialisedForItemId: item.id,

      allocateIn:
        item.isVaccine && allocateVaccineItemsInDoses
          ? AllocateIn.Doses
          : AllocateIn.Units,

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
      initialisedForItemId: null,
      allocateIn: AllocateIn.Units,
      alerts: [],
    })),

  setDraftLines: lines =>
    set(state => ({
      ...state,
      isDirty: true,
      draftLines: lines,
    })),

  setAlerts: alerts =>
    set(state => ({
      ...state,
      alerts,
    })),

  autoAllocate: (quantity, format, t) => {
    const {
      allocateIn,
      draftLines,
      nonAllocatableLines,
      placeholderQuantity,
      setDraftLines,
    } = get();

    const result = allocateQuantities(draftLines, quantity, { allocateIn });

    // Early return if no allocation was possible
    if (!result) {
      return getAllocatedQuantity({ allocateIn, draftLines });
    }

    setDraftLines(result.allocatedLines);

    const allocatedQuantity = getAllocatedQuantity({
      allocateIn,
      draftLines: result.allocatedLines,
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
      allocatedQuantity,
      stillToAllocate,
      hasOnHold,
      hasExpired,
      format,
      t
    );

    set(state => ({
      ...state,
      alerts,
      placeholderQuantity:
        placeholderQuantity === null ? null : stillToAllocate,
    }));

    return allocatedQuantity;
  },

  manualAllocate: (lineId, quantity, format, t) => {
    const { allocateIn, draftLines, setDraftLines } = get();

    // TODO: pass in when using for prescriptions
    const allowPartialPacks = false;

    const updatedLines =
      allocateIn === AllocateIn.Doses
        ? issueDoses(draftLines, lineId, quantity, allowPartialPacks)
        : issuePacks(draftLines, lineId, quantity);

    setDraftLines(updatedLines);

    // Line updated, now check if we need to show any alerts

    const updatedLine = updatedLines.find(line => line.id === lineId);

    const allocatedQuantity = updatedLine
      ? allocateIn === AllocateIn.Doses
        ? packsToDoses(updatedLine.numberOfPacks, updatedLine)
        : // when not in doses, manual allocation is in packs
          updatedLine.numberOfPacks
      : 0;

    // Todo: once prescriptions refactored, see if we can streamline alerts?
    const alerts: StockOutAlert[] =
      allocatedQuantity > quantity
        ? [
            {
              message: t('messages.over-allocated-line', {
                quantity: format(allocatedQuantity),
                issueQuantity: format(quantity),
              }),
              severity: 'warning',
            },
          ]
        : [];

    set(state => ({
      ...state,
      alerts,
    }));

    return allocatedQuantity;
  },
}));
