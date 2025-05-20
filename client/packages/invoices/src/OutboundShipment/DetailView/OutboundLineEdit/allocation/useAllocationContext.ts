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
import { DraftItem } from '../../../..';

/**
 * Allocation can be in units, doses, or packs of a specific size.
 *
 * Throughout allocation code & components, we use `quantity` where possible,
 * this means that piece of logic is agnostic to whether it's in units, doses, or packs.
 *
 * Where behaviour differs, we use `allocateIn` to determine the allocation type.
 */
export enum AllocateInType {
  Units = 'Units',
  Doses = 'Doses',
  Packs = 'Packs',
}

export type AllocateInOption =
  // Pack size only required when allocating in packs
  | { type: AllocateInType.Packs; packSize: number }
  | { type: Exclude<AllocateInType, AllocateInType.Packs> };

export enum AllocationStrategy {
  FEFO = 'FEFO',
  VVMStatus = 'VVMStatus',
}

const SorterByStrategy = {
  [AllocationStrategy.FEFO]: SortUtils.byExpiryAscNonExpiringLast,
  [AllocationStrategy.VVMStatus]: SortUtils.byVVMStatusAsc,
};

interface AllocationContext {
  isDirty: boolean;
  draftLines: DraftStockOutLineFragment[];
  /** Lines which cannot be allocated from, but should be shown to the user */
  nonAllocatableLines: DraftStockOutLineFragment[];
  alerts: StockOutAlert[];
  allocateIn: AllocateInOption;
  item: DraftItem | null;
  placeholderQuantity: number | null;

  initialise: (params: {
    itemData: OutboundLineEditData;
    strategy: AllocationStrategy;
    allowPlaceholder: boolean;
    scannedBatch?: string;
  }) => void;

  setAlerts: (alerts: StockOutAlert[]) => void;
  setAllocateIn: (allocateIn: AllocateInOption) => void;
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
  item: null,
  draftLines: [],
  nonAllocatableLines: [],
  placeholderQuantity: null,
  alerts: [],
  allocateIn: { type: AllocateInType.Units },

  initialise: ({
    itemData: { item, draftLines, placeholderQuantity },
    strategy,
    allowPlaceholder,
    scannedBatch,
  }) => {
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
      allocateIn: { type: AllocateInType.Units },
      availablePackSizes: [],
      alerts: [],
    })),

  setAllocateIn: (allocateIn: AllocateInOption) =>
    set(state => ({
      ...state,
      allocateIn,
    })),

  setAlerts: alerts =>
    set(state => ({
      ...state,
      alerts,
    })),

  autoAllocate: (quantity, format, t) => {
    const { draftLines, nonAllocatableLines, placeholderQuantity, allocateIn } =
      get();

    // If allocating in packs with a specific pack size, filter the lines to only those with matching pack size
    let allocatableLines = draftLines;
    if (allocateIn.type === AllocateInType.Packs && allocateIn.packSize) {
      allocatableLines = draftLines.filter(
        line => line.packSize === allocateIn.packSize
      );
    }

    const result = allocateQuantities(allocatableLines, quantity, {
      allocateIn,
    });

    // Early return if no allocation was possible
    if (!result) {
      return getAllocatedQuantity({ allocateIn, draftLines });
    }

    // Merge allocated lines back with unallocated lines if we were filtering by pack size
    let updatedDraftLines = result.allocatedLines;
    if (allocateIn.type === AllocateInType.Packs && allocateIn.packSize) {
      updatedDraftLines = draftLines.map(line => {
        if (line.packSize !== allocateIn.packSize) return line;
        const allocatedLine = result.allocatedLines.find(
          al => al.id === line.id
        );
        return allocatedLine || line;
      });
    }

    const allocatedQuantity = getAllocatedQuantity({
      allocateIn,
      draftLines: updatedDraftLines,
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
      isDirty: true,
      draftLines: updatedDraftLines,
    }));

    return allocatedQuantity;
  },

  manualAllocate: (lineId, quantity, format, t) => {
    const { allocateIn, draftLines } = get();

    // TODO: pass in when using for prescriptions
    const allowPartialPacks = false;

    const updatedLines =
      allocateIn.type === AllocateInType.Doses
        ? issueDoses(draftLines, lineId, quantity, allowPartialPacks)
        : issuePacks(draftLines, lineId, quantity);

    // Now check if we need to show any alerts
    const updatedLine = updatedLines.find(line => line.id === lineId);

    const allocatedQuantity = updatedLine
      ? allocateIn.type === AllocateInType.Doses
        ? packsToDoses(updatedLine.numberOfPacks, updatedLine)
        : // when not in doses or packs, manual allocation is in packs
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
      isDirty: true,
      draftLines: updatedLines,
      alerts,
    }));

    return allocatedQuantity;
  },
}));
