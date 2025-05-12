import { DateUtils } from '@common/intl';
import { DraftOutboundLineFragment } from '../../../api/operations.generated';

/**
 * Attempts to allocate the requested quantity to the available stock lines.
 *
 * @param draftLines - The stock lines to allocate from - should be sorted according to allocation strategy (e.g. FEFO)
 * @param requestedUnits - The quantity to allocate
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
  draftLines: DraftOutboundLineFragment[],
  requestedUnits: number
) => {
  // if invalid quantity entered, don't allocate
  if (requestedUnits < 0 || Number.isNaN(requestedUnits)) {
    return;
  }

  if (draftLines.length === 0) {
    return {
      allocatedLines: [],
      remainingQuantity: requestedUnits,
    };
  }

  // reset lines
  const newDraftLines = draftLines.map(batch => ({
    ...batch,
    numberOfPacks: 0,
  }));

  const validBatches = newDraftLines.filter(
    ({ expiryDate, availablePacks, stockLineOnHold, location }) =>
      availablePacks > 0 &&
      !stockLineOnHold &&
      !location?.onHold &&
      !(!!expiryDate && DateUtils.isExpired(new Date(expiryDate)))
  );

  let toAllocate = requestedUnits;

  // Step 1: allocate to the nearest (rounded down) pack size
  toAllocate = allocateToBatches({
    validBatches,
    newDraftLines,
    toAllocate,
  });

  // Step 2: if still some remaining quantity allocate to the nearest (rounded up) pack size
  if (toAllocate > 0) {
    toAllocate = allocateToBatches({
      validBatches,
      newDraftLines,
      toAllocate,
      roundUp: true,
    });
  }

  // Step 3: if over-allocated (negative toAllocate), reduce the smaller/earlier
  // lines to try to get back to the requested quantity
  if (toAllocate < 0) {
    toAllocate = reduceBatchAllocation({
      toAllocate: toAllocate * -1,
      validBatches,
      newDraftLines,
    });
  }

  return {
    allocatedLines: newDraftLines,
    remainingQuantity: toAllocate,
  };
};

const allocateToBatches = ({
  validBatches,
  newDraftLines,
  toAllocate,
  roundUp = false,
}: {
  validBatches: DraftOutboundLineFragment[];
  newDraftLines: DraftOutboundLineFragment[];
  toAllocate: number;
  roundUp?: boolean;
}) => {
  validBatches.forEach(batch => {
    if (toAllocate <= 0) return null;

    const draftOutboundLineFragmentIdx = newDraftLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftOutboundLineFragment =
      newDraftLines[draftOutboundLineFragmentIdx];

    if (!draftOutboundLineFragment) return null;

    const {
      availablePacks,
      packSize,
      numberOfPacks: numPacksAlreadyAllocated,
    } = draftOutboundLineFragment;

    const availableUnits =
      Math.floor(availablePacks - numPacksAlreadyAllocated) * packSize;

    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacksToAllocate = unitsToAllocate / packSize;

    const allocatedNumberOfPacks = roundUp
      ? Math.ceil(numberOfPacksToAllocate)
      : Math.floor(numberOfPacksToAllocate);

    toAllocate -= allocatedNumberOfPacks * packSize;

    const numberOfPacks = numPacksAlreadyAllocated + allocatedNumberOfPacks;

    newDraftLines[draftOutboundLineFragmentIdx] = {
      ...draftOutboundLineFragment,
      numberOfPacks,
    };
  });

  return toAllocate;
};

const reduceBatchAllocation = ({
  toAllocate,
  validBatches,
  newDraftLines,
}: {
  toAllocate: number;
  validBatches: DraftOutboundLineFragment[];
  newDraftLines: DraftOutboundLineFragment[];
}) => {
  validBatches
    .slice()
    .reverse() // Reduce the last stock first (e.g. last expiring)
    .forEach(batch => {
      const draftOutboundLineFragmentIdx = newDraftLines.findIndex(
        ({ id }) => batch.id === id
      );
      const draftOutboundLineFragment =
        newDraftLines[draftOutboundLineFragmentIdx];
      if (!draftOutboundLineFragment) return null;

      const { packSize, numberOfPacks: allocatedPacks } =
        draftOutboundLineFragment;

      if (packSize > toAllocate) return null;
      if (allocatedPacks === 0) return null;

      const allocatedUnits = allocatedPacks * packSize;
      const unitsToReduce = Math.min(toAllocate, allocatedUnits);

      const numberOfPacks = Math.floor(
        (allocatedUnits - unitsToReduce) / packSize
      );
      toAllocate -= unitsToReduce;

      newDraftLines[draftOutboundLineFragmentIdx] = {
        ...draftOutboundLineFragment,
        numberOfPacks: numberOfPacks,
      };
    });
  return -toAllocate;
};
