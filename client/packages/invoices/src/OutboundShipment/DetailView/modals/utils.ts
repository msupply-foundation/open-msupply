import { InvoiceNodeStatus } from '@openmsupply-client/common';
import { BatchRow, OutboundShipment } from './../../../types';

export const sortByExpiry = (a: BatchRow, b: BatchRow) => {
  const expiryA = new Date(a.expiryDate ?? '');
  const expiryB = new Date(b.expiryDate ?? '');

  if (expiryA < expiryB) {
    return -1;
  }
  if (expiryA > expiryB) {
    return 1;
  }

  return 0;
};

export const sortByExpiryDesc = (a: BatchRow, b: BatchRow) => {
  const expiryA = new Date(a.expiryDate ?? '');
  const expiryB = new Date(b.expiryDate ?? '');

  if (expiryA < expiryB) {
    return 1;
  }
  if (expiryA > expiryB) {
    return -1;
  }

  return 0;
};

export const sumAvailableQuantity = (batchRows: BatchRow[]) => {
  const sum = batchRows.reduce(
    (acc, { availableNumberOfPacks, packSize }) =>
      acc + availableNumberOfPacks * packSize,
    0
  );

  return sum;
};

export const getAllocatedQuantity = (batchRows: BatchRow[]) => {
  return batchRows.reduce(
    (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
    0
  );
};

export const issueStock = (
  batchRows: BatchRow[],
  idToIssue: string,
  value: number
) => {
  const foundRowIdx = batchRows.findIndex(({ id }) => id === idToIssue);
  const foundRow = batchRows[foundRowIdx];
  if (!foundRow) return [];

  const newBatchRows = [...batchRows];
  newBatchRows[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: value,
  };

  return newBatchRows;
};

export const allocateQuantities =
  (
    draft: OutboundShipment,
    batchRows: BatchRow[],
    setBatchRows: React.Dispatch<React.SetStateAction<BatchRow[]>>
  ) =>
  (newValue: number, issuePackSize: number | null) => {
    // if invalid quantity entered, don't allocate
    if (newValue < 0 || Number.isNaN(newValue)) {
      return;
    }

    // If there is only one batch row, then it is the placeholder.
    // Assign all of the new value and short circuit.
    if (batchRows.length === 1) {
      setBatchRows(
        issueStock(batchRows, 'placeholder', newValue * (issuePackSize || 1))
      );
    }

    // calculations are normalised to units
    const totalToAllocate = newValue * (issuePackSize || 1);
    let toAllocate = totalToAllocate;

    const newBatchRows = batchRows.map(batch => ({
      ...batch,
      numberOfPacks: 0,
    }));
    const validBatches = newBatchRows
      .filter(
        ({ packSize, onHold, availableNumberOfPacks }) =>
          (issuePackSize ? packSize === issuePackSize : true) &&
          availableNumberOfPacks > 0 &&
          !onHold
      )
      .sort(sortByExpiry);

    validBatches.forEach(batch => {
      const batchRowIdx = newBatchRows.findIndex(({ id }) => batch.id === id);
      const batchRow = newBatchRows[batchRowIdx];
      if (!batchRow) return null;
      if (toAllocate < 0) return null;

      const availableUnits =
        batchRow.availableNumberOfPacks * batchRow.packSize;
      const unitsToAllocate = Math.min(toAllocate, availableUnits);
      const allocatedNumberOfPacks = Math.ceil(
        unitsToAllocate / batchRow.packSize
      );

      toAllocate -= allocatedNumberOfPacks * batchRow.packSize;

      newBatchRows[batchRowIdx] = {
        ...batchRow,
        numberOfPacks: allocatedNumberOfPacks,
      };
    });

    // if over-allocated due to pack sizes available, reduce allocation as needed
    if (toAllocate < 0) {
      toAllocate *= -1;
      validBatches.sort(sortByExpiryDesc).forEach(batch => {
        const batchRowIdx = newBatchRows.findIndex(({ id }) => batch.id === id);
        const batchRow = newBatchRows[batchRowIdx];
        if (!batchRow) return null;
        if (batchRow.packSize > toAllocate) return null;
        if (batchRow.numberOfPacks === 0) return null;

        const allocatedUnits = batchRow.numberOfPacks * batchRow.packSize;
        const unitsToReduce = Math.min(toAllocate, allocatedUnits);
        const numberOfPacks = Math.floor(
          (allocatedUnits - unitsToReduce) / batchRow.packSize
        );

        toAllocate -= unitsToReduce;

        newBatchRows[batchRowIdx] = {
          ...batchRow,
          numberOfPacks: numberOfPacks,
        };
      });
    }

    if (draft.status === InvoiceNodeStatus.New) {
      const placeholderIdx = newBatchRows.findIndex(
        ({ id }) => id === 'placeholder'
      );
      const placeholder = newBatchRows[placeholderIdx];

      if (!placeholder) throw new Error('No placeholder within item editing');

      newBatchRows[placeholderIdx] = {
        ...placeholder,
        numberOfPacks:
          placeholder.numberOfPacks + toAllocate * (issuePackSize || 1),
      };
    }

    setBatchRows(newBatchRows);
  };
