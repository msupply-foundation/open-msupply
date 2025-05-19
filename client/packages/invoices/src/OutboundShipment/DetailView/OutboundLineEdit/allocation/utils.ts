import { noOtherVariants, NumUtils } from '@common/utils';
import { DraftStockOutLineFragment } from '../../../api/operations.generated';
import { DateUtils } from '@common/intl';
import { AllocateIn } from './useAllocationContext';

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
        ? acc + packsToDoses(line.availablePacks, line)
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
  placeholderQuantity,
  allocateIn,
}: {
  draftLines: DraftStockOutLineFragment[];
  allocateIn: AllocateIn;
  placeholderQuantity?: number | null;
}) => {
  const quantity =
    allocateIn === AllocateIn.Doses
      ? getAllocatedDoses(draftLines)
      : getAllocatedUnits(draftLines);

  return quantity + (placeholderQuantity ?? 0);
};

/** Converts the value of the `numberOfPacks` field to dose quantity */
export const getDoseQuantity = (line: DraftStockOutLineFragment) => {
  return packsToDoses(line.numberOfPacks, line);
};

/** Converts a number of packs to dose quantity */
export const packsToDoses = (
  numPacks: number,
  line: DraftStockOutLineFragment
) => {
  return NumUtils.round(
    numPacks *
      line.packSize *
      ((line.itemVariant?.dosesPerUnit ?? line.defaultDosesPerUnit) || 1)
  );
};

/** Converts a dose quantity to number of packs */
export const dosesToPacks = (
  doses: number,
  line: DraftStockOutLineFragment
) => {
  return (
    doses /
    line.packSize /
    ((line.itemVariant?.dosesPerUnit ?? line.defaultDosesPerUnit) || 1)
  );
};

/** Converts a number of packs to quantity based on allocation unit of measure */
export const packsToQuantity = (
  allocateIn: AllocateIn,
  numPacks: number,
  line: DraftStockOutLineFragment
): number => {
  switch (allocateIn) {
    case AllocateIn.Doses:
      return packsToDoses(numPacks, line);

    case AllocateIn.Units:
      return numPacks * line.packSize;

    default:
      noOtherVariants(allocateIn);
      throw new Error('Unhandled allocation unit of measure');
  }
};

/** Converts a quantity to number of packs based on allocation unit of measure */
export const quantityToPacks = (
  allocateIn: AllocateIn,
  quantity: number,
  line: DraftStockOutLineFragment
): number => {
  switch (allocateIn) {
    case AllocateIn.Doses:
      return dosesToPacks(quantity, line);

    case AllocateIn.Units:
      return quantity / line.packSize;
    default:
      noOtherVariants(allocateIn);
      throw new Error('Unhandled allocation unit of measure');
  }
};

export const issuePacks = (
  draftLines: DraftStockOutLineFragment[],
  idToIssue: string,
  packs: number
) => {
  const foundRowIdx = draftLines.findIndex(({ id }) => id === idToIssue);
  const foundRow = draftLines[foundRowIdx];
  if (!foundRow) return draftLines;

  const newDraftLines = [...draftLines];
  newDraftLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: packs,
  };

  return newDraftLines;
};

export const issueDoses = (
  draftLines: DraftStockOutLineFragment[],
  idToIssue: string,
  doses: number,
  allowPartialPacks: boolean = false
) => {
  const foundRowIdx = draftLines.findIndex(({ id }) => id === idToIssue);
  const foundRow = draftLines[foundRowIdx];
  if (!foundRow) return draftLines;

  const newDraftLines = [...draftLines];

  const numberOfPacks = dosesToPacks(doses, foundRow);

  newDraftLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: allowPartialPacks ? numberOfPacks : Math.ceil(numberOfPacks),
  };

  return newDraftLines;
};

export const canAllocate = (line: DraftStockOutLineFragment): boolean =>
  !line.stockLineOnHold && !line.location?.onHold && line.availablePacks > 0;

export const canAutoAllocate = (line: DraftStockOutLineFragment) =>
  canAllocate(line) &&
  // shouldn't auto-allocate expired lines
  !(!!line.expiryDate && DateUtils.isExpired(new Date(line.expiryDate))) &&
  // should not be able to auto-allocate lines with unusable VVM status
  !line.vvmStatus?.unusable;

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
