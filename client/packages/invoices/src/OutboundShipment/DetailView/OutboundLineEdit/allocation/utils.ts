import { NumUtils } from '@common/utils';
import { DraftOutboundLineFragment } from '../../../api/operations.generated';

export const sumAvailableQuantity = (
  draftLines: DraftOutboundLineFragment[]
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
  draftLines: DraftOutboundLineFragment[];
  placeholderQuantity: number | null;
}) =>
  NumUtils.round(
    draftLines.reduce(
      (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
      0
    ),
    3
  ) + (placeholderQuantity ?? 0);

export const issueStock = (
  draftLines: DraftOutboundLineFragment[],
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
