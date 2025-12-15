import {
  ArrayUtils,
  create,
  LocaleKey,
  SortUtils,
  TypedTFunction,
} from '@openmsupply-client/common';
import {
  StockOutAlert,
  canAllocate,
  getAllocatedQuantity,
  issue,
  packsToQuantity,
  scannedBatchFilter,
  getAutoAllocationAlerts,
  OutboundLineEditData,
  DraftItem,
  DraftStockOutLineFragment,
  normaliseToUnits,
  getManualAllocationAlerts,
  unitsToQuantity,
} from '.';
import { allocateQuantities } from './allocateQuantities';
import { VvmStatusFragment } from '@openmsupply-client/system';

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
  prescribedUnits: number | null;
  note: string | null;

  initialise: (
    params: {
      itemData: OutboundLineEditData;
      strategy: AllocationStrategy;
      allowPlaceholder: boolean;
      allowPrescribedQuantity?: boolean;
      scannedBatch?: string;
      allocateIn?: AllocateInOption;
      ignoreNonAllocatableLines?: boolean;
    },
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;

  setAlerts: (alerts: StockOutAlert[]) => void;
  setPrescribedQuantity: (quantity: number) => void;
  setNote: (note: string | null) => void;
  setVvmStatus: (id: string, vvmStatus?: VvmStatusFragment | null) => void;
  setAllocateIn: (
    allocateIn: AllocateInOption,
    // TODO: these are passed into a few functions, can we intialise with them instead?
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;
  setIsDirty: (isDirty: boolean) => void;
  clear: () => void;

  reallocateLines: (
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>
  ) => void;
  manualAllocate: (
    lineId: string,
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>,
    options?: {
      /** manualAllocate can be called from a different lens than we currently displaying in */
      allocateInType?: AllocateInType;
      /** manualAllocate can be called from a different lens than we currently displaying in */
      preventPartialPacks?: boolean;
    }
  ) => number;
  autoAllocate: (
    quantity: number,
    format: (value: number, options?: Intl.NumberFormatOptions) => string,
    t: TypedTFunction<LocaleKey>,
    expiryThresholdDays: number,
    allowPartialPacks?: boolean
  ) => number;
}

export const useAllocationContext = create<AllocationContext>((set, get) => ({
  isDirty: false,
  item: null,
  draftLines: [],
  nonAllocatableLines: [],
  placeholderUnits: null,
  prescribedUnits: null,
  alerts: [],
  allocateIn: { type: AllocateInType.Units },
  note: null,

  initialise: (
    {
      itemData: { item, draftLines, placeholderUnits, prescribedUnits, note },
      strategy,
      allowPlaceholder,
      allowPrescribedQuantity,
      scannedBatch,
      allocateIn: inputAllocateIn,
      ignoreNonAllocatableLines,
    },
    format,
    t
  ) => {
    const { reallocateLines } = get();
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

    const allocateIn = inputAllocateIn ?? { type: AllocateInType.Units };
    set({
      isDirty: false,
      item,
      note,
      allocateIn,

      draftLines: allocatableLines,
      // When not ignored, we still want to display non-allocatable lines to the user
      // (e.g. stock on hold, expired) for context, and show alerts about them
      nonAllocatableLines: ignoreNonAllocatableLines ? [] : nonAllocatableLines,

      placeholderUnits: allowPlaceholder ? (placeholderUnits ?? 0) : null,
      prescribedUnits: allowPrescribedQuantity ? (prescribedUnits ?? 0) : null,
      alerts: [],
    });

    const allocatedQuantity = getAllocatedQuantity({
      draftLines: allocatableLines,
      allocateIn,
    });

    // If no quantity has yet been allocated, attempt to allocate the placeholder on initialise
    if (allocatedQuantity === 0) {
      reallocateLines(format, t);
      set(state => ({
        ...state,
        alerts: [
          ...state.alerts,
          { message: t('messages.auto-allocated-lines'), severity: 'warning' },
        ],
      }));
    }
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
      note: null,
      prescribedUnits: null,
    })),

  setAllocateIn: (allocateIn, format, t) => {
    const { reallocateLines } = get();

    set(state => ({
      ...state,
      alerts: [],
      allocateIn,
    }));

    // Changing to unit or dose is just a lens change,
    // but changing which pack size to allocate in means we might
    // need to redistribute the stock.
    if (allocateIn.type === AllocateInType.Packs) {
      reallocateLines(format, t);
    }
  },

  reallocateLines: (format, t) => {
    const { draftLines, allocateIn, placeholderUnits, autoAllocate, item } =
      get();

    const unitQuantityIncludingPlaceholder =
      getAllocatedQuantity({
        draftLines,
        allocateIn: { type: AllocateInType.Units },
      }) + (placeholderUnits ?? 0);

    const quantityInNewPackSize = unitsToQuantity(
      allocateIn,
      unitQuantityIncludingPlaceholder,
      item?.doses ?? 0
    );

    autoAllocate(quantityInNewPackSize, format, t, 0);
  },

  setAlerts: alerts =>
    set(state => ({
      ...state,
      alerts,
    })),

  setIsDirty: isDirty =>
    set(state => ({
      ...state,
      isDirty,
    })),

  setNote: note =>
    set(state => ({
      ...state,
      note,
      isDirty: true,
    })),

  setPrescribedQuantity: (quantity: number) => {
    const { allocateIn, item } = get();

    set(state => ({
      ...state,
      prescribedUnits: normaliseToUnits(quantity, allocateIn, item?.doses || 1),
      isDirty: true,
    }));
  },

  setVvmStatus: (id: string, vvmStatus?: VvmStatusFragment | null) => {
    const { draftLines } = get();

    const updatedLines = draftLines.map(line =>
      line.id === id
        ? {
            ...line,
            numberOfPacks: vvmStatus?.unusable ? 0 : line.numberOfPacks,
            vvmStatus,
          }
        : line
    );
    set(state => ({
      ...state,
      draftLines: updatedLines,
      isDirty: true,
    }));
  },

  autoAllocate: (
    quantity,
    format,
    t,
    expiryThresholdDays,
    allowPartialPacks = false
  ) => {
    const {
      draftLines,
      nonAllocatableLines,
      placeholderUnits,
      allocateIn,
      item,
    } = get();

    const result = allocateQuantities(draftLines, quantity, {
      allocateIn,
      allowPartialPacks,
      expiryThresholdDays,
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

    // Note that a placeholder is always considered to be pack size 1
    // So if issuing in larger pack sizes, we need to adjust the placeholder
    const remainingAsUnits = normaliseToUnits(
      placeholderUnits !== null ? result.remainingQuantity : 0,
      allocateIn,
      item?.doses || 1
    );

    const placeholderInUnits = allowPartialPacks
      ? remainingAsUnits
      : Math.ceil(remainingAsUnits);

    const alerts = getAutoAllocationAlerts(
      quantity,
      allocatedQuantity,
      placeholderInUnits,
      hasOnHold,
      allocateIn,
      result.allocatedLines,
      item?.doses || 1,
      format,
      t
    );

    set(state => ({
      ...state,
      alerts,
      placeholderUnits: placeholderUnits === null ? null : placeholderInUnits,
      isDirty: true,
      draftLines: result.allocatedLines,
    }));

    return allocatedQuantity;
  },

  manualAllocate: (lineId, quantity, format, t, options) => {
    const { allocateIn, draftLines } = get();
    const allocateInType = options?.allocateInType ?? allocateIn.type;

    const updatedLines = issue(
      draftLines,
      lineId,
      quantity,
      allocateInType,
      !options?.preventPartialPacks
    );

    // Now check if we need to show any alerts
    const updatedLine = updatedLines.find(line => line.id === lineId);
    const allocatedQuantity = updatedLine
      ? packsToQuantity(allocateInType, updatedLine.numberOfPacks, updatedLine)
      : 0;

    const alerts = updatedLine
      ? getManualAllocationAlerts(
          quantity,
          allocatedQuantity,
          updatedLine,
          allocateInType,
          format,
          t
        )
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
