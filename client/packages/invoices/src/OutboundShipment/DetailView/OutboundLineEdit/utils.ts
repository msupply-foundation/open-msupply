import {
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  DateUtils,
  SortUtils,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from './../../../types';

export const sumAvailableQuantity = (
  draftOutboundLines: DraftOutboundLine[]
) => {
  const sum = draftOutboundLines.reduce(
    (acc, { stockLine, packSize }) =>
      acc + (stockLine?.availableNumberOfPacks ?? 0) * packSize,
    0
  );

  return sum;
};

export const getAllocatedQuantity = (draftOutboundLines: DraftOutboundLine[]) =>
  draftOutboundLines.reduce(
    (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
    0
  );

export const issueStock = (
  draftOutboundLines: DraftOutboundLine[],
  idToIssue: string,
  value: number
) => {
  const foundRowIdx = draftOutboundLines.findIndex(
    ({ id }) => id === idToIssue
  );
  const foundRow = draftOutboundLines[foundRowIdx];
  if (!foundRow) return [];

  const newDraftOutboundLines = [...draftOutboundLines];
  newDraftOutboundLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: value,
    isUpdated: true,
  };

  return newDraftOutboundLines;
};

export const allocateQuantities =
  (status: InvoiceNodeStatus, draftOutboundLines: DraftOutboundLine[]) =>
  (newValue: number, issuePackSize: number | null) => {
    // if invalid quantity entered, don't allocate
    if (newValue < 0 || Number.isNaN(newValue)) {
      return;
    }

    // If there is only one batch row, then it is the placeholder.
    // Assign all of the new value and short circuit.
    if (draftOutboundLines.length === 1 && status === InvoiceNodeStatus.New) {
      const placeholder = draftOutboundLines.find(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );
      return issueStock(
        draftOutboundLines,
        placeholder?.id ?? '',
        newValue * (issuePackSize || 1)
      );
    }

    // calculations are normalised to units
    const totalToAllocate = newValue * (issuePackSize || 1);
    let toAllocate = totalToAllocate;

    const newDraftOutboundLines = draftOutboundLines.map(batch => ({
      ...batch,
      numberOfPacks: 0,
    }));
    const validBatches = newDraftOutboundLines
      .filter(
        ({ expiryDate, packSize, stockLine }) =>
          (issuePackSize ? packSize === issuePackSize : true) &&
          (stockLine?.availableNumberOfPacks ?? 0) > 0 &&
          !stockLine?.onHold &&
          !(!!expiryDate && DateUtils.isExpired(new Date(expiryDate)))
      )
      .sort(SortUtils.byExpiryAsc);

    toAllocate = allocateToBatches({
      validBatches,
      newDraftOutboundLines,
      toAllocate,
    });

    // when the last batch to be allocated results in over allocation due to pack size
    // reduce the quantity allocated to previous batches as required
    // if toAllocate is negative then we have over allocated
    if (toAllocate < 0) {
      toAllocate = reduceBatchAllocation({
        toAllocate: toAllocate * -1,
        validBatches,
        newDraftOutboundLines,
      });

      // If there is still a quantity to allocate, then still over allocated. this time reduce
      // lines with a pack size greater than the amount to allocate
      if (toAllocate > 0) {
        toAllocate = reduceBatchAllocation({
          toAllocate,
          validBatches,
          newDraftOutboundLines,
          includeOversizePacks: true,
        });
      }

      // if there is still some to allocate, then review existing allocated lines
      // and see if they can be increased. This is to cater for the scenario where
      // the second reduction above has reduce a line which has a larger pack size
      if (toAllocate > 0) {
        toAllocate = allocatedAdditionalStock({
          validBatches,
          newDraftOutboundLines,
          toAllocate,
        });
      }
    }

    if (status === InvoiceNodeStatus.New) {
      const placeholderIdx = newDraftOutboundLines.findIndex(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );
      const placeholder = newDraftOutboundLines[placeholderIdx];

      if (!placeholder) throw new Error('No placeholder within item editing');

      // stock has been allocated, and the auto generated placeholder is no longer required
      if (shouldUpdatePlaceholder(newValue, placeholder))
        placeholder.isUpdated = true;

      newDraftOutboundLines[placeholderIdx] = {
        ...placeholder,
        numberOfPacks: placeholder.numberOfPacks + toAllocate,
      };
    }

    return newDraftOutboundLines;
  };

const allocateToBatches = ({
  validBatches,
  newDraftOutboundLines,
  toAllocate,
}: {
  validBatches: DraftOutboundLine[];
  newDraftOutboundLines: DraftOutboundLine[];
  toAllocate: number;
}) => {
  validBatches.forEach(batch => {
    const draftOutboundLineIdx = newDraftOutboundLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftOutboundLine = newDraftOutboundLines[draftOutboundLineIdx];
    if (!draftOutboundLine) return null;
    if (toAllocate < 0) return null;

    const availableUnits =
      (draftOutboundLine.stockLine?.availableNumberOfPacks ?? 0) *
      draftOutboundLine.packSize;
    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacks = unitsToAllocate / draftOutboundLine.packSize;
    const allocatedNumberOfPacks = Math.ceil(numberOfPacks);

    toAllocate -= allocatedNumberOfPacks * draftOutboundLine.packSize;

    newDraftOutboundLines[draftOutboundLineIdx] = {
      ...draftOutboundLine,
      numberOfPacks: allocatedNumberOfPacks,
    };
  });
  return toAllocate;
};

const allocatedAdditionalStock = ({
  validBatches,
  newDraftOutboundLines,
  toAllocate,
}: {
  validBatches: DraftOutboundLine[];
  newDraftOutboundLines: DraftOutboundLine[];
  toAllocate: number;
}) => {
  validBatches.forEach(batch => {
    const draftOutboundLineIdx = newDraftOutboundLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftOutboundLine = newDraftOutboundLines[draftOutboundLineIdx];
    if (!draftOutboundLine) return null;
    if (toAllocate < 0) return null;
    if (draftOutboundLine.packSize > toAllocate) return null;

    const availableUnits =
      ((draftOutboundLine.stockLine?.availableNumberOfPacks ?? 0) -
        draftOutboundLine.numberOfPacks) *
      draftOutboundLine.packSize;

    if (availableUnits <= 0) return null;

    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacks = unitsToAllocate / draftOutboundLine.packSize;
    const allocatedNumberOfPacks = Math.floor(numberOfPacks);

    toAllocate -= allocatedNumberOfPacks * draftOutboundLine.packSize;
    draftOutboundLine.numberOfPacks = allocatedNumberOfPacks;
  });
  return toAllocate;
};

const reduceBatchAllocation = ({
  toAllocate,
  validBatches,
  newDraftOutboundLines,
  includeOversizePacks = false,
}: {
  toAllocate: number;
  validBatches: DraftOutboundLine[];
  newDraftOutboundLines: DraftOutboundLine[];
  includeOversizePacks?: boolean;
}) => {
  validBatches
    .slice()
    .sort(SortUtils.byExpiryDesc)
    .forEach(batch => {
      const draftOutboundLineIdx = newDraftOutboundLines.findIndex(
        ({ id }) => batch.id === id
      );
      const draftOutboundLine = newDraftOutboundLines[draftOutboundLineIdx];
      if (!draftOutboundLine) return null;
      if (includeOversizePacks && draftOutboundLine.packSize < toAllocate)
        return null;
      if (!includeOversizePacks && draftOutboundLine.packSize > toAllocate)
        return null;
      if (draftOutboundLine.numberOfPacks === 0) return null;

      const allocatedUnits =
        draftOutboundLine.numberOfPacks * draftOutboundLine.packSize;
      const unitsToReduce = Math.min(toAllocate, allocatedUnits);
      const numberOfPacks = Math.floor(
        (allocatedUnits - unitsToReduce) / draftOutboundLine.packSize
      );
      toAllocate -= includeOversizePacks
        ? (draftOutboundLine.numberOfPacks - numberOfPacks) *
          draftOutboundLine.packSize
        : unitsToReduce;

      newDraftOutboundLines[draftOutboundLineIdx] = {
        ...draftOutboundLine,
        numberOfPacks: numberOfPacks,
      };
    });
  return Math.abs(toAllocate);
};

export const shouldUpdatePlaceholder = (
  quantity: number,
  placeholder: DraftOutboundLine
) => quantity > 0 && placeholder.numberOfPacks === 0 && !placeholder.isCreated;
