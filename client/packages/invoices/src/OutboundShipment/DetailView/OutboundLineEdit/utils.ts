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
  if (!foundRow) return draftOutboundLines;

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

    // if there is still a quantity to allocate, run through all stock lines again
    // and round up if necessary to meet or exceed the requested quantity
    if (toAllocate > 0) {
      toAllocate = allocateToBatches({
        validBatches,
        newDraftOutboundLines,
        toAllocate,
        roundUp: true,
      });
    }

    // when the last batch to be allocated results in over allocation
    // reduce the quantity allocated to previous batches as required
    // if toAllocate is negative then we have over allocated
    if (toAllocate < 0) {
      toAllocate = reduceBatchAllocation({
        toAllocate: toAllocate * -1,
        validBatches,
        newDraftOutboundLines,
      });
    }

    if (status === InvoiceNodeStatus.New) {
      const placeholderIdx = newDraftOutboundLines.findIndex(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );
      const placeholder = newDraftOutboundLines[placeholderIdx];
      const oldPlaceholder = draftOutboundLines[placeholderIdx];
      // remove if the oldPlaceholder.numberOfPacks is non-zero and the new placeholder.numberOfPacks is zero
      const placeholderRemoved =
        oldPlaceholder?.numberOfPacks && placeholder?.numberOfPacks === 0;

      // the isUpdated flag must be set in order to delete the placeholder row
      if (placeholderRemoved) {
        placeholder.isUpdated = true;
      }

      if (toAllocate > 0) {
        if (!placeholder) throw new Error('No placeholder within item editing');

        // stock has been allocated, and the auto generated placeholder is no longer required
        if (shouldUpdatePlaceholder(newValue, placeholder))
          placeholder.isUpdated = true;

        newDraftOutboundLines[placeholderIdx] = {
          ...placeholder,
          numberOfPacks: placeholder.numberOfPacks + toAllocate,
        };
      }
    }
    return newDraftOutboundLines;
  };

const allocateToBatches = ({
  validBatches,
  newDraftOutboundLines,
  toAllocate,
  roundUp = false,
}: {
  validBatches: DraftOutboundLine[];
  newDraftOutboundLines: DraftOutboundLine[];
  toAllocate: number;
  roundUp?: boolean;
}) => {
  validBatches.forEach(batch => {
    const draftOutboundLineIdx = newDraftOutboundLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftOutboundLine = newDraftOutboundLines[draftOutboundLineIdx];
    if (!draftOutboundLine) return null;
    if (toAllocate <= 0) return null;

    const stockLineNode = draftOutboundLine.stockLine;
    // note: taking numberOfPacks into account here, because this fn is used
    // a second time to round up the allocation
    const availableUnits =
      Math.floor(
        (stockLineNode?.availableNumberOfPacks ?? 0) -
          draftOutboundLine.numberOfPacks
      ) * draftOutboundLine.packSize;
    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacksToAllocate =
      unitsToAllocate / draftOutboundLine.packSize;
    const allocatedNumberOfPacks = roundUp
      ? Math.ceil(numberOfPacksToAllocate)
      : Math.floor(numberOfPacksToAllocate);

    toAllocate -= allocatedNumberOfPacks * draftOutboundLine.packSize;

    const numberOfPacks =
      draftOutboundLine.numberOfPacks + allocatedNumberOfPacks;
    const isUpdated = numberOfPacks > 0;

    newDraftOutboundLines[draftOutboundLineIdx] = {
      ...draftOutboundLine,
      numberOfPacks,
      isUpdated,
    };
  });
  return toAllocate;
};

const reduceBatchAllocation = ({
  toAllocate,
  validBatches,
  newDraftOutboundLines,
}: {
  toAllocate: number;
  validBatches: DraftOutboundLine[];
  newDraftOutboundLines: DraftOutboundLine[];
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

      if (draftOutboundLine.packSize > toAllocate) return null;
      if (draftOutboundLine.numberOfPacks === 0) return null;

      const allocatedUnits =
        draftOutboundLine.numberOfPacks * draftOutboundLine.packSize;
      const unitsToReduce = Math.min(toAllocate, allocatedUnits);

      const numberOfPacks = Math.floor(
        (allocatedUnits - unitsToReduce) / draftOutboundLine.packSize
      );
      toAllocate -= unitsToReduce;

      newDraftOutboundLines[draftOutboundLineIdx] = {
        ...draftOutboundLine,
        numberOfPacks: numberOfPacks,
        isUpdated: numberOfPacks > 0,
      };
    });
  return -toAllocate;
};

export const shouldUpdatePlaceholder = (
  quantity: number,
  placeholder: DraftOutboundLine
) => quantity > 0 && !placeholder.isCreated;
