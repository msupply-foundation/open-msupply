import { NumUtils, SortUtils } from '@common/utils';
import { InvoiceLineNodeType } from '@common/types';
import { DateUtils } from '@common/intl';
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

export const getAllocatedQuantity = (
  draftLines: DraftOutboundLineFragment[] | DraftOutboundLineFragment[]
) =>
  NumUtils.round(
    draftLines.reduce(
      (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
      0
    ),
    3
  );

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

// TODO: this but more sense

export const allocateQuantities = (
  draftLines: DraftOutboundLineFragment[],
  newValue: number,
  allowPlaceholder: boolean
) => {
  // if invalid quantity entered, don't allocate
  if (newValue < 0 || Number.isNaN(newValue)) {
    return;
  }

  // If there is only one batch row, then it is the placeholder.
  // Assign all of the new value and short circuit.
  const placeholder = draftLines.find(
    ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
  );
  if (placeholder && draftLines.length === 1 && allowPlaceholder) {
    return issueStock(draftLines, placeholder?.id ?? '', newValue);
  }

  // calculations are normalised to units
  let toAllocate = newValue;
  const newDraftLines = draftLines.map(batch => ({
    ...batch,
    numberOfPacks: 0,
    isUpdated: batch.numberOfPacks > 0,
  }));

  // todo - make this so easy to change..
  const validBatches = newDraftLines
    .filter(
      ({ expiryDate, availablePacks, stockLineOnHold, location }) =>
        availablePacks > 0 &&
        !stockLineOnHold &&
        !location?.onHold &&
        !(!!expiryDate && DateUtils.isExpired(new Date(expiryDate)))
    )
    .sort(SortUtils.byExpiryAsc);

  toAllocate = allocateToBatches({
    validBatches,
    newDraftLines,
    toAllocate,
  });

  // if there is still a quantity to allocate, run through all stock lines again
  // and round up if necessary to meet or exceed the requested quantity
  if (toAllocate > 0) {
    toAllocate = allocateToBatches({
      validBatches,
      newDraftLines,
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
      newDraftLines,
    });
  }

  // DO from ctx
  // if (allowPlaceholder) {
  //   const placeholderIdx = newDraftLines.findIndex(
  //     ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
  //   );
  //   const placeholder = newDraftLines[placeholderIdx];
  //   const oldPlaceholder = draftLines[placeholderIdx];
  //   // remove if the oldPlaceholder.numberOfPacks is non-zero and the new placeholder.numberOfPacks is zero
  //   const placeholderRemoved =
  //     oldPlaceholder?.numberOfPacks && placeholder?.numberOfPacks === 0;

  //   // the isUpdated flag must be set in order to delete the placeholder row
  //   if (placeholderRemoved) {
  //     placeholder.isUpdated = true;
  //   }

  //   if (toAllocate > 0) {
  //     if (!placeholder) {
  //       // throw new Error('No placeholder within item editing');
  //     } else {
  //       // stock has been allocated, and the auto generated placeholder is no longer required
  //       if (shouldUpdatePlaceholder(newValue, placeholder))
  //         placeholder.isUpdated = true;

  //       newDraftLines[placeholderIdx] = {
  //         ...placeholder,
  //         numberOfPacks: placeholder.numberOfPacks + toAllocate,
  //       };
  //     }
  //   }
  // }

  return newDraftLines;
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
    const draftOutboundLineFragmentIdx = newDraftLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftOutboundLineFragment =
      newDraftLines[draftOutboundLineFragmentIdx];
    if (!draftOutboundLineFragment) return null;
    if (toAllocate <= 0) return null;

    // note: taking numberOfPacks into account here, because this fn is used
    // a second time to round up the allocation
    const availableUnits =
      Math.floor(
        draftOutboundLineFragment.availablePacks -
          draftOutboundLineFragment.numberOfPacks
      ) * draftOutboundLineFragment.packSize;

    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacksToAllocate =
      unitsToAllocate / draftOutboundLineFragment.packSize;
    const allocatedNumberOfPacks = roundUp
      ? Math.ceil(numberOfPacksToAllocate)
      : Math.floor(numberOfPacksToAllocate);

    toAllocate -= allocatedNumberOfPacks * draftOutboundLineFragment.packSize;

    const numberOfPacks =
      draftOutboundLineFragment.numberOfPacks + allocatedNumberOfPacks;

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
    .sort(SortUtils.byExpiryDesc)
    .forEach(batch => {
      const draftOutboundLineFragmentIdx = newDraftLines.findIndex(
        ({ id }) => batch.id === id
      );
      const draftOutboundLineFragment =
        newDraftLines[draftOutboundLineFragmentIdx];
      if (!draftOutboundLineFragment) return null;

      if (draftOutboundLineFragment.packSize > toAllocate) return null;
      if (draftOutboundLineFragment.numberOfPacks === 0) return null;

      const allocatedUnits =
        draftOutboundLineFragment.numberOfPacks *
        draftOutboundLineFragment.packSize;
      const unitsToReduce = Math.min(toAllocate, allocatedUnits);

      const numberOfPacks = Math.floor(
        (allocatedUnits - unitsToReduce) / draftOutboundLineFragment.packSize
      );
      toAllocate -= unitsToReduce;

      newDraftLines[draftOutboundLineFragmentIdx] = {
        ...draftOutboundLineFragment,
        numberOfPacks: numberOfPacks,
      };
    });
  return -toAllocate;
};

// export const shouldUpdatePlaceholder = (
//   quantity: number,
//   placeholder: DraftOutboundLineFragment
// ) => quantity > 0 && !placeholder.isCreated;

// export const PackQuantityCell = (
//   props: CellProps<DraftOutboundLineFragment>
// ) => (
//   <NumberInputCell
//     {...props}
//     max={props.rowData.stockLine?.availableNumberOfPacks}
//     id={getPackQuantityCellId(props.rowData.stockLine?.batch)}
//     decimalLimit={2}
//     min={0}
//   />
// );

// export const UnitQuantityCell = (
//   props: CellProps<DraftOutboundLineFragment>
// ) => (
//   <NumberInputCell
//     {...props}
//     max={
//       (props.rowData.stockLine?.availableNumberOfPacks ?? 0) *
//       (props.rowData.stockLine?.packSize ?? 1)
//     }
//     id={getPackQuantityCellId(props.rowData.stockLine?.batch)}
//     min={0}
//     decimalLimit={2}
//     slotProps={{
//       htmlInput: {
//         sx: {
//           backgroundColor: props.isDisabled ? undefined : 'background.white',
//         },
//       },
//     }}
//   />
// );

// export const getAllocationAlerts = (
//   requestedQuantity: number,
//   allocatedQuantity: number,
//   placeholderQuantity: number,
//   hasOnHold: boolean,
//   hasExpired: boolean,
//   format: (value: number, options?: Intl.NumberFormatOptions) => string,
//   t: TypedTFunction<LocaleKey>
// ) => {
//   const alerts: StockOutAlert[] = [];

//   const unavailableStockWarning = `${
//     hasOnHold ? t('messages.stock-on-hold') : ''
//   } ${hasExpired ? t('messages.stock-expired') : ''}`.trim();

//   if (unavailableStockWarning && requestedQuantity > 0) {
//     alerts.push({
//       message: unavailableStockWarning,
//       severity: 'info',
//     });
//   }

//   if (allocatedQuantity !== requestedQuantity && allocatedQuantity > 0) {
//     alerts.push({
//       message: t('messages.over-allocated', {
//         quantity: format(allocatedQuantity),
//         issueQuantity: format(requestedQuantity),
//       }),
//       severity: 'warning',
//     });
//     return alerts;
//   }
//   if (placeholderQuantity > 0) {
//     alerts.push({
//       message: t('messages.placeholder-allocated', { placeholderQuantity }),
//       severity: 'info',
//     });
//   }
//   return alerts;
// };
