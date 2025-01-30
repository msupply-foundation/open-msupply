import { FnUtils, NumUtils, SortUtils } from '@common/utils';
import { NumberInputCell, CellProps } from '@openmsupply-client/common';
import { DraftStockOutLine } from '../types';
import { InvoiceLineNodeType, InvoiceNodeStatus } from '@common/types';
import {
  PartialStockLineFragment,
  StockOutLineFragment,
} from './operations.generated';
import { DateUtils, LocaleKey, TypedTFunction } from '@common/intl';
import React from 'react';
import { getPackQuantityCellId } from '../utils';
import { StockOutAlert } from './Components';
import { ItemPriceFragment } from '../OutboundShipment/api/operations.generated';

export const createStockOutPlaceholderRow = (
  invoiceId: string,
  itemId: string,
  id = FnUtils.generateUUID()
): DraftStockOutLine => ({
  __typename: 'InvoiceLineNode',
  batch: '',
  id,
  packSize: 1,
  sellPricePerPack: 0,
  costPricePerPack: 0,
  numberOfPacks: 0,
  isCreated: true,
  isUpdated: false,
  invoiceId,
  totalAfterTax: 0,
  totalBeforeTax: 0,
  expiryDate: undefined,
  type: InvoiceLineNodeType.UnallocatedStock,
  item: { id: itemId, code: '', name: '', __typename: 'ItemNode' },
  itemName: '',
});

export interface DraftStockOutLineSeeds {
  invoiceId: string;
  invoiceLine: StockOutLineFragment;
  invoiceStatus: InvoiceNodeStatus;
  stockLine?: PartialStockLineFragment; // If this is not provided, the stock line from the invoice line will be used
}

export const createDraftStockOutLineFromStockLine = ({
  invoiceId,
  stockLine,
  defaultPricing,
}: {
  invoiceId: string;
  stockLine: PartialStockLineFragment;
  defaultPricing?: ItemPriceFragment;
}): DraftStockOutLine => {
  let sellPricePerPack = stockLine?.sellPricePerPack ?? 0;

  // if there's a default price, it overrides the stock line price
  if (defaultPricing?.defaultPricePerUnit) {
    sellPricePerPack =
      defaultPricing?.defaultPricePerUnit ?? 0 * (stockLine?.packSize ?? 1);
  }

  if (defaultPricing?.discountPercentage) {
    sellPricePerPack =
      sellPricePerPack * (1 - defaultPricing.discountPercentage / 100);
  }

  return {
    isCreated: true,
    isUpdated: false,
    type: InvoiceLineNodeType.StockOut,
    numberOfPacks: 0,
    location: stockLine?.location,
    expiryDate: stockLine?.expiryDate,
    sellPricePerPack,
    costPricePerPack: 0,
    packSize: stockLine?.packSize ?? 0,
    id: FnUtils.generateUUID(),
    invoiceId,
    totalAfterTax: 0,
    totalBeforeTax: 0,
    itemName: stockLine?.item?.name ?? '',
    __typename: 'InvoiceLineNode',

    item: {
      id: stockLine?.itemId ?? '',
      name: stockLine?.item?.name,
      code: stockLine?.item?.code,
      __typename: 'ItemNode',
    },

    stockLine,
  };
};

export const createDraftStockOutLine = ({
  invoiceLine,
  stockLine,
  invoiceStatus,
}: DraftStockOutLineSeeds): DraftStockOutLine => {
  // When creating a draft stock out line from an invoice line we may need to adjust the available and total number of packs
  // This is because, once an invoice line is created (even in New Status), the available number of packs is reduced by the number of packs in the invoice line
  // After it is in picked status, the total number of packs is also reduced by the number of packs in the invoice line
  // Other statuses such as Shipped shouldn't show the stock line as available, so we don't need to adjust the available number of packs
  // If the invoice is New, no adjustments are needed, as the stockLines shouldn't be updated yet

  const adjustTotalNumberOfPacks = invoiceStatus === InvoiceNodeStatus.Picked;

  // Note to future self, the stockLine spread here is important, if not spread you'll be modifying the passed in data which can affect the tanStack Query Cache, with unintended effects!
  let adjustedStockLine = stockLine
    ? { ...stockLine }
    : invoiceLine?.stockLine
      ? { ...invoiceLine?.stockLine }
      : undefined;
  if (!!adjustedStockLine) {
    adjustedStockLine.availableNumberOfPacks =
      adjustedStockLine.availableNumberOfPacks + invoiceLine.numberOfPacks;
    adjustedStockLine.totalNumberOfPacks = adjustTotalNumberOfPacks
      ? adjustedStockLine.totalNumberOfPacks + invoiceLine.numberOfPacks
      : adjustedStockLine.totalNumberOfPacks;
  }

  const draftStockOutLine = {
    isCreated: !invoiceLine,
    isUpdated: false,
    ...invoiceLine,
    ...(adjustedStockLine
      ? {
          stockLine: {
            ...adjustedStockLine,
          },
        }
      : {}),
  };
  return draftStockOutLine;
};

export interface UseDraftStockOutLinesControl {
  draftStockOutLines: DraftStockOutLine[];
  updateQuantity: (batchId: string, quantity: number) => void;
  isLoading: boolean;
  setDraftStockOutLines: React.Dispatch<
    React.SetStateAction<DraftStockOutLine[]>
  >;
}

export const sumAvailableQuantity = (
  draftStockOutLines: DraftStockOutLine[]
) => {
  const sum = draftStockOutLines.reduce(
    (acc, { stockLine, packSize, location }) =>
      !location?.onHold && !stockLine?.onHold
        ? acc + (stockLine?.availableNumberOfPacks ?? 0) * packSize
        : acc,
    0
  );

  return sum;
};

export const getAllocatedQuantity = (draftStockOutLines: DraftStockOutLine[]) =>
  NumUtils.round(
    draftStockOutLines.reduce(
      (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
      0
    ),
    3
  );

export const issueStock = (
  draftStockOutLines: DraftStockOutLine[],
  idToIssue: string,
  packs: number
) => {
  const foundRowIdx = draftStockOutLines.findIndex(
    ({ id }) => id === idToIssue
  );
  const foundRow = draftStockOutLines[foundRowIdx];
  if (!foundRow) return draftStockOutLines;

  const newDraftStockOutLines = [...draftStockOutLines];
  newDraftStockOutLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: packs,
    isUpdated: true,
  };

  return newDraftStockOutLines;
};

export const allocateQuantities =
  (status: InvoiceNodeStatus, draftStockOutLines: DraftStockOutLine[]) =>
  (
    newValue: number,
    issuePackSize: number | null,
    allowPartialPacks: boolean = false
  ) => {
    // if invalid quantity entered, don't allocate
    if (newValue < 0 || Number.isNaN(newValue)) {
      return;
    }

    // If there is only one batch row, then it is the placeholder.
    // Assign all of the new value and short circuit.
    const placeholder = draftStockOutLines.find(
      ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
    );
    if (
      placeholder &&
      draftStockOutLines.length === 1 &&
      status === InvoiceNodeStatus.New
    ) {
      return issueStock(
        draftStockOutLines,
        placeholder?.id ?? '',
        newValue * (issuePackSize || 1)
      );
    }

    // calculations are normalised to units
    const totalToAllocate = newValue * (issuePackSize || 1);
    let toAllocate = totalToAllocate;
    const newDraftStockOutLines = draftStockOutLines.map(batch => ({
      ...batch,
      numberOfPacks: 0,
      isUpdated: batch.numberOfPacks > 0,
    }));

    const validBatches = newDraftStockOutLines
      .filter(
        ({ expiryDate, packSize, stockLine, location }) =>
          (issuePackSize ? packSize === issuePackSize : true) &&
          (stockLine?.availableNumberOfPacks ?? 0) > 0 &&
          !stockLine?.onHold &&
          !location?.onHold &&
          !(!!expiryDate && DateUtils.isExpired(new Date(expiryDate)))
      )
      .sort(SortUtils.byExpiryAsc);

    toAllocate = allocateToBatches({
      validBatches,
      newDraftStockOutLines,
      toAllocate,
      allowPartialPacks,
    });

    // if there is still a quantity to allocate, run through all stock lines again
    // and round up if necessary to meet or exceed the requested quantity
    if (toAllocate > 0) {
      toAllocate = allocateToBatches({
        validBatches,
        newDraftStockOutLines,
        toAllocate,
        roundUp: true,
        allowPartialPacks,
      });
    }

    // when the last batch to be allocated results in over allocation
    // reduce the quantity allocated to previous batches as required
    // if toAllocate is negative then we have over allocated
    if (toAllocate < 0) {
      toAllocate = reduceBatchAllocation({
        toAllocate: toAllocate * -1,
        validBatches,
        newDraftStockOutLines,
      });
    }

    if (status === InvoiceNodeStatus.New) {
      const placeholderIdx = newDraftStockOutLines.findIndex(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );
      const placeholder = newDraftStockOutLines[placeholderIdx];
      const oldPlaceholder = draftStockOutLines[placeholderIdx];
      // remove if the oldPlaceholder.numberOfPacks is non-zero and the new placeholder.numberOfPacks is zero
      const placeholderRemoved =
        oldPlaceholder?.numberOfPacks && placeholder?.numberOfPacks === 0;

      // the isUpdated flag must be set in order to delete the placeholder row
      if (placeholderRemoved) {
        placeholder.isUpdated = true;
      }

      if (toAllocate > 0) {
        if (!placeholder) {
          // throw new Error('No placeholder within item editing');
        } else {
          // stock has been allocated, and the auto generated placeholder is no longer required
          if (shouldUpdatePlaceholder(newValue, placeholder))
            placeholder.isUpdated = true;

          newDraftStockOutLines[placeholderIdx] = {
            ...placeholder,
            numberOfPacks: placeholder.numberOfPacks + toAllocate,
          };
        }
      }
    }
    return newDraftStockOutLines;
  };

const allocateToBatches = ({
  validBatches,
  newDraftStockOutLines,
  toAllocate,
  roundUp = false,
  allowPartialPacks,
}: {
  validBatches: DraftStockOutLine[];
  newDraftStockOutLines: DraftStockOutLine[];
  toAllocate: number;
  roundUp?: boolean;
  allowPartialPacks: boolean;
}) => {
  validBatches.forEach(batch => {
    const draftStockOutLineIdx = newDraftStockOutLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftStockOutLine = newDraftStockOutLines[draftStockOutLineIdx];
    if (!draftStockOutLine) return null;
    if (toAllocate <= 0) return null;

    const stockLineNode = draftStockOutLine.stockLine;
    // note: taking numberOfPacks into account here, because this fn is used
    // a second time to round up the allocation
    const availableUnits =
      Math.floor(
        (stockLineNode?.availableNumberOfPacks ?? 0) -
          draftStockOutLine.numberOfPacks
      ) * draftStockOutLine.packSize;
    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacksToAllocate =
      unitsToAllocate / draftStockOutLine.packSize;
    const allocatedNumberOfPacks = allowPartialPacks
      ? numberOfPacksToAllocate
      : roundUp
        ? Math.ceil(numberOfPacksToAllocate)
        : Math.floor(numberOfPacksToAllocate);

    toAllocate -= allocatedNumberOfPacks * draftStockOutLine.packSize;

    const numberOfPacks =
      draftStockOutLine.numberOfPacks + allocatedNumberOfPacks;
    const isUpdated = numberOfPacks > 0;

    newDraftStockOutLines[draftStockOutLineIdx] = {
      ...draftStockOutLine,
      numberOfPacks,
      isUpdated,
    };
  });
  return toAllocate;
};

const reduceBatchAllocation = ({
  toAllocate,
  validBatches,
  newDraftStockOutLines,
}: {
  toAllocate: number;
  validBatches: DraftStockOutLine[];
  newDraftStockOutLines: DraftStockOutLine[];
}) => {
  validBatches
    .slice()
    .sort(SortUtils.byExpiryDesc)
    .forEach(batch => {
      const draftStockOutLineIdx = newDraftStockOutLines.findIndex(
        ({ id }) => batch.id === id
      );
      const draftStockOutLine = newDraftStockOutLines[draftStockOutLineIdx];
      if (!draftStockOutLine) return null;

      if (draftStockOutLine.packSize > toAllocate) return null;
      if (draftStockOutLine.numberOfPacks === 0) return null;

      const allocatedUnits =
        draftStockOutLine.numberOfPacks * draftStockOutLine.packSize;
      const unitsToReduce = Math.min(toAllocate, allocatedUnits);

      const numberOfPacks = Math.floor(
        (allocatedUnits - unitsToReduce) / draftStockOutLine.packSize
      );
      toAllocate -= unitsToReduce;

      newDraftStockOutLines[draftStockOutLineIdx] = {
        ...draftStockOutLine,
        numberOfPacks: numberOfPacks,
        isUpdated: numberOfPacks > 0,
      };
    });
  return -toAllocate;
};

export const shouldUpdatePlaceholder = (
  quantity: number,
  placeholder: DraftStockOutLine
) => quantity > 0 && !placeholder.isCreated;

export const PackQuantityCell = (props: CellProps<DraftStockOutLine>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.stockLine?.availableNumberOfPacks}
    id={getPackQuantityCellId(props.rowData.stockLine?.batch)}
    decimalLimit={2}
    min={0}
  />
);

export const UnitQuantityCell = (props: CellProps<DraftStockOutLine>) => (
  <NumberInputCell
    {...props}
    max={
      (props.rowData.stockLine?.availableNumberOfPacks ?? 0) *
      (props.rowData.stockLine?.packSize ?? 1)
    }
    id={getPackQuantityCellId(props.rowData.stockLine?.batch)}
    min={0}
    decimalLimit={2}
  />
);

export const updateNotes = (
  draftStockOutLines: DraftStockOutLine[],
  note: string
) => {
  return draftStockOutLines.map(line => ({ ...line, note, isUpdated: true }));
};

export const getAllocationAlerts = (
  requestedQuantity: number,
  allocatedQuantity: number,
  placeholderQuantity: number,
  hasOnHold: boolean,
  hasExpired: boolean,
  format: (value: number, options?: Intl.NumberFormatOptions) => string,
  t: TypedTFunction<LocaleKey>
) => {
  const alerts: StockOutAlert[] = [];

  const unavailableStockWarning = `${
    hasOnHold ? t('messages.stock-on-hold') : ''
  } ${hasExpired ? t('messages.stock-expired') : ''}`.trim();

  if (unavailableStockWarning && requestedQuantity > 0) {
    alerts.push({
      message: unavailableStockWarning,
      severity: 'info',
    });
  }

  if (allocatedQuantity !== requestedQuantity && allocatedQuantity > 0) {
    alerts.push({
      message: t('messages.over-allocated', {
        quantity: format(allocatedQuantity),
        issueQuantity: format(requestedQuantity),
      }),
      severity: 'warning',
    });
    return alerts;
  }
  if (placeholderQuantity > 0) {
    alerts.push({
      message: t('messages.placeholder-allocated', { placeholderQuantity }),
      severity: 'info',
    });
  }

  return alerts;
};
