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
  placeholderUnits: number | null;

  initialise: (params: {
    itemData: OutboundLineEditData;
    strategy: AllocationStrategy;
    allowPlaceholder: boolean;
    scannedBatch?: string;
  }) => void;

  setAlerts: (alerts: StockOutAlert[]) => void;
  setAllocateIn: (
    allocateIn: AllocateInOption,
    // TODO: these are passed into a few functions, can we intialise with them instead?
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;
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
  placeholderUnits: null,
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

      placeholderUnits: allowPlaceholder ? (placeholderQuantity ?? 0) : null,
      alerts: [],
    });
  },

  clear: () =>
    set(state => ({
      ...state,
      isDirty: false,
      draftLines: [],
      nonAllocatableLines: [],
      placeholderUnits: null,
      item: null,
      allocateIn: { type: AllocateInType.Units },
      availablePackSizes: [],
      alerts: [],
    })),

  setAllocateIn: (allocateIn, format, t) => {
    const { draftLines, placeholderUnits, autoAllocate } = get();

    set(state => ({
      ...state,
      alerts: [],
      allocateIn,
    }));

    // Changing to unit or dose is just a lens change,
    // but changing which pack size to allocate in means we might
    // need to redistribute the stock.
    if (allocateIn.type === AllocateInType.Packs) {
      const existingQuantityInUnits =
        getAllocatedQuantity({
          draftLines,
          allocateIn: { type: AllocateInType.Units },
        }) + (placeholderUnits ?? 0);

      const quantityInNewPackSize =
        existingQuantityInUnits / allocateIn.packSize;

      autoAllocate(quantityInNewPackSize, format, t);
    }
  },

  setAlerts: alerts =>
    set(state => ({
      ...state,
      alerts,
    })),

  autoAllocate: (quantity, format, t) => {
    const { draftLines, nonAllocatableLines, placeholderUnits, allocateIn } =
      get();

    const result = allocateQuantities(draftLines, quantity, {
      allocateIn,
    });

    // Early return if no allocation was possible
    if (!result) {
      return getAllocatedQuantity({ allocateIn, draftLines });
    }

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

    // Note that a placeholder is always considered to be pack size 1, 1 dose per unit
    // So if issuing in larger pack sizes, we need to adjust the placeholder
    const placeholderInUnits =
      allocateIn.type === AllocateInType.Packs
        ? stillToAllocate * allocateIn.packSize
        : stillToAllocate;

    set(state => ({
      ...state,
      alerts,
      placeholderUnits:
        placeholderUnits === null ? null : Math.round(placeholderInUnits), // handle .0000000001 when switching between pack sizes
      isDirty: true,
      draftLines: result.allocatedLines,
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
      isDirty: true,
      draftLines: updatedLines,
      alerts,
    }));

    return allocatedQuantity;
  },
}));
