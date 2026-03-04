import { noOtherVariants, NumUtils, QuantityUtils } from '@common/utils';
import { DateUtils, LocaleKey, TypedTFunction } from '@common/intl';
import {
  AllocateInOption,
  AllocateInType,
  DraftStockOutLineFragment,
  StockOutAlert,
} from '.';

export const sumAvailableUnits = (draftLines: DraftStockOutLineFragment[]) => {
  const sum = draftLines.reduce(
    (acc, { stockLineOnHold, availablePacks, packSize, location }) =>
      !location?.onHold && !stockLineOnHold
        ? acc + availablePacks * packSize
        : acc,
    0
  );

  return sum;
};

export const sumAvailableDoses = (draftLines: DraftStockOutLineFragment[]) => {
  const sum = draftLines.reduce(
    (acc, line) =>
      !line.location?.onHold && !line.stockLineOnHold
        ? acc + QuantityUtils.packsToDoses(line.availablePacks, line)
        : acc,
    0
  );

  return sum;
};

const getAllocatedUnits = (draftLines: DraftStockOutLineFragment[]) =>
  NumUtils.round(
    draftLines.reduce(
      (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
      0
    ),
    3
  );

const getAllocatedDoses = (draftLines: DraftStockOutLineFragment[]) => {
  return draftLines.reduce((acc, line) => acc + getDoseQuantity(line), 0);
};

export const getAllocatedQuantity = ({
  draftLines,
  allocateIn,
}: {
  draftLines: DraftStockOutLineFragment[];
  allocateIn: AllocateInOption;
}): number => {
  switch (allocateIn.type) {
    case AllocateInType.Doses:
      return getAllocatedDoses(draftLines);

    case AllocateInType.Units:
      return getAllocatedUnits(draftLines);

    case AllocateInType.Packs:
      return getAllocatedUnits(draftLines) / (allocateIn.packSize || 1);

    default:
      noOtherVariants(allocateIn);
      throw new Error('Unhandled allocation unit of measure');
  }
};

/** Converts the value of the `numberOfPacks` field to dose quantity */
export const getDoseQuantity = (line: DraftStockOutLineFragment) => {
  return QuantityUtils.packsToDoses(line.numberOfPacks, line);
};

/** Converts a number of packs to quantity based on allocation unit of measure */
export const packsToQuantity = (
  allocateIn: AllocateInType,
  numPacks: number,
  line: DraftStockOutLineFragment
): number => {
  switch (allocateIn) {
    case AllocateInType.Doses:
      return QuantityUtils.packsToDoses(numPacks, line);

    case AllocateInType.Units:
      return numPacks * line.packSize;

    case AllocateInType.Packs:
      return numPacks;

    default:
      noOtherVariants(allocateIn);
      throw new Error('Unhandled allocation unit of measure');
  }
};
/** Converts a number of units to quantity based on allocation unit of measure */
export const unitsToQuantity = (
  allocateIn: AllocateInOption,
  numUnits: number,
  dosesPerUnit: number
): number => {
  switch (allocateIn.type) {
    case AllocateInType.Doses:
      return numUnits * (dosesPerUnit || 1);

    case AllocateInType.Units:
      return numUnits;

    case AllocateInType.Packs:
      return numUnits / allocateIn.packSize;

    default:
      noOtherVariants(allocateIn);
      throw new Error('Unhandled allocation unit of measure');
  }
};

/** Converts a quantity to number of packs based on allocation unit of measure */
export const quantityToPacks = (
  allocateIn: AllocateInType,
  quantity: number,
  line: DraftStockOutLineFragment
): number => {
  switch (allocateIn) {
    case AllocateInType.Doses:
      return QuantityUtils.dosesToPacks(quantity, line);

    case AllocateInType.Units:
      return quantity / line.packSize;

    case AllocateInType.Packs:
      return quantity;

    default:
      noOtherVariants(allocateIn);
      throw new Error('Unhandled allocation unit of measure');
  }
};

export const issue = (
  draftLines: DraftStockOutLineFragment[],
  idToIssue: string,
  quantity: number,
  allocateIn: AllocateInType,
  allowPartialPacks: boolean = false // todo - true?
) => {
  const foundRowIdx = draftLines.findIndex(({ id }) => id === idToIssue);
  const foundRow = draftLines[foundRowIdx];
  if (!foundRow) return draftLines;
  const newDraftLines = [...draftLines];

  const enteredPacks = quantityToPacks(allocateIn, quantity, foundRow);

  const numberOfPacks = allowPartialPacks
    ? enteredPacks
    : Math.ceil(enteredPacks);

  newDraftLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks:
      numberOfPacks > foundRow.availablePacks
        ? Math.floor(foundRow.availablePacks)
        : numberOfPacks,
  };
  return newDraftLines;
};

export const showLines = (line: DraftStockOutLineFragment): boolean => {
  const isOnHold = line.stockLineOnHold || line.location?.onHold;

  // If on hold, can only be in allocatable set if there are already packs allocated
  if (isOnHold) {
    return line.numberOfPacks > 0 && line.availablePacks > 0;
  }

  // If not on hold, can allocate if there are available packs
  return line.availablePacks > 0;
};

export const canAutoAllocate = (
  line: DraftStockOutLineFragment,
  expiryThresholdDays: number,
  requiredPackSize?: number
) => {
  const lastAllowableDate = line.expiryDate
    ? DateUtils.addDays(new Date(line.expiryDate), -expiryThresholdDays)
    : undefined;

  return (
    showLines(line) &&
    // should not auto-allocate from on-hold lines
    !line.stockLineOnHold &&
    !line.location?.onHold &&
    // shouldn't auto-allocate expired lines
    !(!!lastAllowableDate && DateUtils.isExpired(lastAllowableDate)) &&
    // should not be able to auto-allocate lines with unusable VVM status
    !line.vvmStatus?.unusable &&
    // if pack size is specified, should match the line's pack size
    (!requiredPackSize || line.packSize === requiredPackSize)
  );
};

export const scannedBatchFilter = (
  allLines: DraftStockOutLineFragment[],
  selectedLine: DraftStockOutLineFragment,
  scannedBatch: string
) => {
  const linesIncludeScannedBatch = allLines.some(l => l.batch === scannedBatch);

  // If the requested batch is not in the list, we can allocate any line
  if (!linesIncludeScannedBatch) return true;

  return selectedLine.batch === scannedBatch;
};

export const normaliseToUnits = (
  quantity: number,
  allocateIn: AllocateInOption,
  dosesPerUnit: number
) => {
  switch (allocateIn.type) {
    case AllocateInType.Doses:
      return quantity / (dosesPerUnit || 1);

    case AllocateInType.Units:
      return quantity;

    case AllocateInType.Packs:
      // If working in packs, should be whole units
      return NumUtils.round(quantity * allocateIn.packSize);
  }
};

export const getAutoAllocationAlerts = (
  requestedQuantity: number,
  allocatedQuantity: number,
  placeholderUnits: number,
  hasOnHold: boolean,
  allocateIn: AllocateInOption,
  draftLines: DraftStockOutLineFragment[],
  dosesPerUnit: number,
  format: (value: number, options?: Intl.NumberFormatOptions) => string,
  t: TypedTFunction<LocaleKey>
) => {
  const alerts: StockOutAlert[] = [];

  const hasExpired = draftLines.some(
    ({ expiryDate }) =>
      !!expiryDate && DateUtils.isExpired(new Date(expiryDate))
  );

  // Explain why some stock lines are not allocated from
  const unavailableStockWarning = `${
    hasOnHold ? t('messages.stock-on-hold') : ''
  } ${hasExpired ? t('messages.stock-expired') : ''}`.trim();

  if (unavailableStockWarning && requestedQuantity > 0) {
    alerts.push({
      message: unavailableStockWarning,
      severity: 'info',
    });
  }

  // When available pack sizes meant we had to over-allocate to meet the requested quantity
  if (allocatedQuantity > requestedQuantity && allocatedQuantity > 0) {
    alerts.push({
      message: t('messages.over-allocated', {
        quantity: format(allocatedQuantity),
        issueQuantity: format(requestedQuantity),
      }),
      severity: 'warning',
    });
    return alerts;
  }

  const isDoses = allocateIn.type === AllocateInType.Doses;

  // If we didn't have enough stock to meet the requested quantity
  if (allocatedQuantity < requestedQuantity) {
    // If we were able to create a placeholder, let the user know
    if (placeholderUnits > 0) {
      let messageKey: LocaleKey = 'messages.placeholder-allocated-units';
      let packSize = 1;
      switch (allocateIn.type) {
        case AllocateInType.Doses:
          messageKey = 'messages.placeholder-allocated-doses';
          break;
        case AllocateInType.Units:
          messageKey = 'messages.placeholder-allocated-units';
          break;
        case AllocateInType.Packs:
          messageKey = 'messages.placeholder-allocated-packs';
          packSize = allocateIn.packSize;
          break;
        default:
      }
      alerts.push({
        message: t(messageKey, {
          requestedQuantity: format(requestedQuantity),
          placeholderQuantity: format(
            isDoses ? placeholderUnits * dosesPerUnit : placeholderUnits
          ),
          packSize,
        }),
        severity: 'info',
      });
    } else {
      // Otherwise warn the user that we couldn't allocate enough stock
      let messageKey: LocaleKey;
      switch (allocateIn.type) {
        case AllocateInType.Doses:
          messageKey = 'warning.cannot-create-placeholder-doses';
          break;
        case AllocateInType.Units:
          messageKey = 'warning.cannot-create-placeholder-units';
          break;
        case AllocateInType.Packs:
          messageKey = 'warning.cannot-create-placeholder-packs';
          break;
        default:
          messageKey = 'warning.cannot-create-placeholder-units';
      }
      alerts.push({
        message: t(messageKey, {
          allocatedQuantity: format(allocatedQuantity),
          requestedQuantity: format(requestedQuantity),
        }),
        severity: 'warning',
      });
    }
  }

  // If we allocated in partial packs, check with user that they are able to break packs
  const asWholePacks = draftLines.map(line => ({
    ...line,
    numberOfPacks: Math.ceil(line.numberOfPacks),
  }));

  const wholePackQuantity = getAllocatedQuantity({
    draftLines: asWholePacks,
    allocateIn,
  });

  if (wholePackQuantity > allocatedQuantity) {
    alerts.push({
      message: t(
        `messages.partial-pack-warning-${isDoses ? 'doses' : 'units'}`,
        { nearestAbove: wholePackQuantity }
      ),
      severity: 'warning',
    });
  }

  return alerts;
};

export const getManualAllocationAlerts = (
  requestedQuantity: number,
  allocatedQuantity: number,
  line: DraftStockOutLineFragment,
  allocateInType: AllocateInType,
  format: (value: number, options?: Intl.NumberFormatOptions) => string,
  t: TypedTFunction<LocaleKey>
): StockOutAlert[] => {
  const alerts: StockOutAlert[] = [];

  if (allocatedQuantity !== requestedQuantity)
    alerts.push({
      message: t('messages.over-allocated-line', {
        quantity: format(allocatedQuantity),
        issueQuantity: format(requestedQuantity),
      }),
      severity: 'warning',
    });

  const nearestWholePack = packsToQuantity(
    allocateInType,
    Math.ceil(line.numberOfPacks),
    line
  );

  if (nearestWholePack > allocatedQuantity) {
    alerts.push({
      message: t(
        `messages.partial-pack-warning-${allocateInType === AllocateInType.Doses ? 'doses' : 'units'}`,
        { nearestAbove: nearestWholePack }
      ),
      severity: 'warning',
    });
  }

  return alerts;
};
