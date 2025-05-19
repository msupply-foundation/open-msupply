import { DraftStockOutLineFragment } from '../../../api/operations.generated';
import { AllocateIn } from './useAllocationContext';
import { canAutoAllocate, packsToQuantity, quantityToPacks } from './utils';

/**
 * Attempts to allocate the requested quantity to the available stock lines.
 *
 * @param draftLines - The stock lines to allocate from - should be sorted according to allocation strategy (e.g. FEFO)
 * @param quantity - The quantity to allocate
 * @param options - allocateIn: The unit of measure to allocate in (e.g. units, doses)
 * @returns The allocated stock lines and the remaining quantity
 *
 * Only available stock lines will be allocated to (i.e. not on hold, not expired, etc).
 *
 * How is stock allocated? We try to allocate as close to the requested quantity as possible,
 * with a bias towards the first stock line(s) in the list (e.g. first expiring).
 *
 * This can take up to 3 steps, let's look at an example with 2 stock lines:
 *
 * 200 x pack size 1    (exp 01/26)
 * 3 x   pack size 100  (exp 03/26)
 *
 * And we are requesting 350 units.
 *
 * Step 1: from top of list allocate to the nearest (rounded down) pack size
 *
 * 200 x pack size 1    (exp 01/26)     Allocated 200
 * 3 x   pack size 100  (exp 03/26)     Allocated 1
 *                                   Total units: 300
 *
 * Step 2: Only 300/350 allocated, so let's round up
 *
 * 200 x pack size 1    (exp 01/26)     Allocated 200
 * 3 x   pack size 100  (exp 03/26)     Allocated 2
 *                                   Total units: 400
 *
 * Step 3: Reduce the smaller/earlier stock lines, to get back to the requested quantity
 *
 * 200 x pack size 1    (exp 01/26)     Allocated 150
 * 3 x   pack size 100  (exp 03/26)     Allocated 2
 *                                   Total units: 350
 *
 * This way, we allocate as much of the the earliest expiring stock as possible, but ensure
 * we don't over allocate.
 *
 * Note: over-allocation will occur if the requested quantity is not a multiple of the pack sizes available
 * (e.g. requesting 350 units with only pack size 100 available - 400 units would be allocated)
 *
 * If there is less stock available than requested, a remaining quantity will also be returned
 *
 */

export const allocateQuantities = (
  draftLines: DraftStockOutLineFragment[],
  quantity: number,
  { allocateIn }: { allocateIn: AllocateIn }
) => {
  // if invalid quantity entered, don't allocate
  if (quantity < 0 || Number.isNaN(quantity)) {
    return;
  }

  if (draftLines.length === 0) {
    return {
      allocatedLines: [],
      remainingQuantity: quantity,
    };
  }

  // reset lines
  const newDraftLines = draftLines.map(batch => ({
    ...batch,
    numberOfPacks: 0,
  }));

  const validBatches = newDraftLines.filter(canAutoAllocate);

  let quantityToAllocate = quantity;

  // Step 1: allocate to the nearest (rounded down) pack size
  quantityToAllocate = allocateToBatches({
    validBatches,
    newDraftLines,
    quantityToAllocate,
    allocateIn,
  });

  // Step 2: if still some remaining quantity allocate to the nearest (rounded up) pack size
  if (quantityToAllocate > 0) {
    quantityToAllocate = allocateToBatches({
      validBatches,
      newDraftLines,
      quantityToAllocate,
      allocateIn,
      roundUp: true,
    });
  }

  // Step 3: if over-allocated (negative quantityToAllocate), reduce the smaller/earlier
  // lines to try to get back to the requested quantity
  if (quantityToAllocate < 0) {
    quantityToAllocate = reduceBatchAllocation({
      quantityToAllocate: quantityToAllocate * -1,
      validBatches,
      newDraftLines,
      allocateIn,
    });
  }

  return {
    allocatedLines: newDraftLines,
    remainingQuantity: quantityToAllocate,
  };
};

const allocateToBatches = ({
  validBatches,
  newDraftLines,
  quantityToAllocate: remainingQuantityToAllocate,
  allocateIn,
  roundUp = false,
}: {
  validBatches: DraftStockOutLineFragment[];
  newDraftLines: DraftStockOutLineFragment[];
  quantityToAllocate: number;
  allocateIn: AllocateIn;
  roundUp?: boolean;
}) => {
  validBatches.forEach(batch => {
    if (remainingQuantityToAllocate <= 0) return null;

    const draftLineIndex = newDraftLines.findIndex(({ id }) => batch.id === id);
    const draftLine = newDraftLines[draftLineIndex];

    if (!draftLine) return null;

    // helpers
    const toQuantity = (packs: number) =>
      packsToQuantity(allocateIn, packs, draftLine);
    const toPacks = (quantity: number) =>
      quantityToPacks(allocateIn, quantity, draftLine);

    // TODO: Allow partial packs check would be needed before .floor() here
    const allocatablePacks = Math.floor(
      // remove already allocated packs from available
      draftLine.availablePacks - draftLine.numberOfPacks
    );

    const quantityToAllocate = Math.min(
      remainingQuantityToAllocate,
      toQuantity(allocatablePacks)
    );

    const numberOfPacksToAllocate = toPacks(quantityToAllocate);

    // TODO: Allow partial packs check would be needed before rounding here
    const allocatedNumberOfPacks = roundUp
      ? Math.ceil(numberOfPacksToAllocate)
      : Math.floor(numberOfPacksToAllocate);

    remainingQuantityToAllocate -= toQuantity(allocatedNumberOfPacks);

    newDraftLines[draftLineIndex] = {
      ...draftLine,
      numberOfPacks: draftLine.numberOfPacks + allocatedNumberOfPacks,
    };
  });

  return remainingQuantityToAllocate;
};

const reduceBatchAllocation = ({
  quantityToAllocate: remainingQuantityToAllocate,
  validBatches,
  newDraftLines,
  allocateIn,
}: {
  quantityToAllocate: number;
  validBatches: DraftStockOutLineFragment[];
  newDraftLines: DraftStockOutLineFragment[];
  allocateIn: AllocateIn;
}) => {
  validBatches
    .slice()
    .reverse() // Reduce the last stock first (e.g. last expiring)
    .forEach(batch => {
      const draftLineIndex = newDraftLines.findIndex(
        ({ id }) => batch.id === id
      );
      const draftLine = newDraftLines[draftLineIndex];
      if (!draftLine) return null;

      const { packSize, numberOfPacks: allocatedPacks } = draftLine;

      if (allocatedPacks === 0) return null;

      // TODO: Allow partial packs check would be needed before early exit here.
      if (packSize > remainingQuantityToAllocate) return null;

      // helper closures
      const toQuantity = (packs: number) =>
        packsToQuantity(allocateIn, packs, draftLine);
      const toPacks = (quantity: number) =>
        quantityToPacks(allocateIn, quantity, draftLine);

      // -----------------------

      const allocatedQuantity = toQuantity(allocatedPacks);

      const quantityToReduce = Math.min(
        remainingQuantityToAllocate,
        allocatedQuantity
      );

      // TODO: Allow partial packs check would be needed before .floor() here
      const packsToReduce = Math.floor(toPacks(quantityToReduce));

      remainingQuantityToAllocate -= toQuantity(packsToReduce);

      newDraftLines[draftLineIndex] = {
        ...draftLine,
        numberOfPacks: allocatedPacks - packsToReduce,
      };
    });
  return -remainingQuantityToAllocate;
};
