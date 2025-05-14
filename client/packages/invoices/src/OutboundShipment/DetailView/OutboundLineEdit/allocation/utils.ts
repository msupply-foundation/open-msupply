import { NumUtils } from '@common/utils';
import { DraftStockOutLineFragment } from '../../../api/operations.generated';
import { DateUtils } from '@common/intl';

export const sumAvailableQuantity = (
  draftLines: DraftStockOutLineFragment[]
) => {
  const sum = draftLines.reduce(
    (acc, { stockLineOnHold, availablePacks, packSize, location }) =>
      !location?.onHold && !stockLineOnHold
        ? acc + availablePacks * packSize
        : acc,
    0
  );

  return sum;
};

export const getAllocatedUnits = ({
  draftLines,
  placeholderQuantity,
}: {
  draftLines: DraftStockOutLineFragment[];
  placeholderQuantity?: number | null;
}) =>
  NumUtils.round(
    draftLines.reduce(
      (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
      0
    ),
    3
  ) + (placeholderQuantity ?? 0);

export const getAllocatedDoses = ({
  draftLines,
  placeholderQuantity,
}: {
  draftLines: DraftStockOutLineFragment[];
  placeholderQuantity?: number | null;
}) => {
  const doses = NumUtils.round(
    draftLines.reduce((acc, line) => acc + getDoseQuantity(line), 0)
  );

  return doses + (placeholderQuantity ?? 0);
};

export const getDoseQuantity = (line: DraftStockOutLineFragment) => {
  return NumUtils.round(
    line.numberOfPacks *
      line.packSize *
      ((line.itemVariant?.dosesPerUnit ?? line.defaultDosesPerUnit) || 1)
  );
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

  const numberOfPacks =
    doses /
    foundRow.packSize /
    ((foundRow.itemVariant?.dosesPerUnit ?? foundRow.defaultDosesPerUnit) || 1);

  newDraftLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: allowPartialPacks ? numberOfPacks : Math.ceil(numberOfPacks),
  };

  return newDraftLines;
};

export const canAllocate = (line: DraftStockOutLineFragment) =>
  !line.stockLineOnHold && !line.location?.onHold && line.availablePacks > 0;

export const canAutoAllocate = (line: DraftStockOutLineFragment) =>
  canAllocate(line) &&
  // shouldn't auto-allocate expired lines
  !(!!line.expiryDate && DateUtils.isExpired(new Date(line.expiryDate)));

export const scannedBatchFilter = (
  allLines: DraftStockOutLineFragment[],
  selectedLine: DraftStockOutLineFragment,
  scannedBatch: string
) => {
  if (!canAllocate(selectedLine)) return false;

  const linesIncludeScannedBatch = allLines.some(l => l.batch === scannedBatch);

  // If the requested batch is not in the list, we can allocate any line
  if (!linesIncludeScannedBatch) return true;

  return selectedLine.batch === scannedBatch;
};
