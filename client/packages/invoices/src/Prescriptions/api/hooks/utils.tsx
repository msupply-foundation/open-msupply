import {
  DateUtils,
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  InvoiceSortFieldInput,
  RecordPatch,
  UpdatePrescriptionStatusInput,
  NumberInputCell,
  CellProps,
} from '@openmsupply-client/common';
import { FnUtils, SortUtils } from '@common/utils';
import {
  PartialPrescriptionLineFragment,
  PrescriptionLineFragment,
  PrescriptionRowFragment,
} from '../operations.generated';
import React from 'react';
import { DraftPrescriptionLine } from 'packages/invoices/src/types';
import { ItemPriceFragment } from 'packages/invoices/src/OutboundShipment/api/operations.generated';
import { getPackQuantityCellId } from '../../../utils';

export const sortFieldMap: Record<string, InvoiceSortFieldInput> = {
  createdDateTime: InvoiceSortFieldInput.CreatedDatetime,
  prescriptionDatetime: InvoiceSortFieldInput.InvoiceDatetime,
  otherPartyName: InvoiceSortFieldInput.OtherPartyName,
  comment: InvoiceSortFieldInput.Comment,
  invoiceNumber: InvoiceSortFieldInput.InvoiceNumber,
  status: InvoiceSortFieldInput.Status,
  pickedDatetime: InvoiceSortFieldInput.PickedDatetime,
};

export const mapStatus = (patch: RecordPatch<PrescriptionRowFragment>) => {
  switch (patch.status) {
    case InvoiceNodeStatus.Picked:
      return UpdatePrescriptionStatusInput.Picked;
    case InvoiceNodeStatus.Verified:
      return UpdatePrescriptionStatusInput.Verified;
    default:
      return undefined;
  }
};

export const createInputObject = (
  line: DraftPrescriptionLine,
  type: 'insert' | 'update' | 'delete'
) => {
  const { id, numberOfPacks, prescribedQuantity, stockLine, invoiceId, note } =
    line;

  const stockLineId = stockLine?.id ?? '';
  const output = { id, numberOfPacks, stockLineId, note, prescribedQuantity };

  switch (type) {
    case 'delete':
      return { id };
    case 'update':
      return output;
    case 'insert':
      return { ...output, invoiceId };
  }
};

export const createPrescriptionPlaceholderRow = (
  invoiceId: string,
  itemId: string,
  id = FnUtils.generateUUID()
): DraftPrescriptionLine => ({
  __typename: 'InvoiceLineNode',
  batch: '',
  id,
  packSize: 1,
  sellPricePerPack: 0,
  costPricePerPack: 0,
  numberOfPacks: 0,
  prescribedQuantity: 0,
  isCreated: true,
  isUpdated: false,
  invoiceId,
  totalAfterTax: 0,
  totalBeforeTax: 0,
  expiryDate: undefined,
  type: InvoiceLineNodeType.UnallocatedStock,
  item: {
    id: itemId,
    code: '',
    name: '',
    __typename: 'ItemNode',
    itemDirections: [],
  },
  itemName: '',
});

export interface DraftPrescriptionLineSeeds {
  invoiceId: string;
  invoiceLine: PrescriptionLineFragment;
  invoiceStatus: InvoiceNodeStatus;
  stockLine?: PartialPrescriptionLineFragment; // If this is not provided, the stock line from the invoice line will be used
  // Is this needed?
}

export const createDraftPrescriptionLineFromStockLine = ({
  invoiceId,
  stockLine,
  defaultPricing,
}: {
  invoiceId: string;
  stockLine: PartialPrescriptionLineFragment;
  defaultPricing?: ItemPriceFragment;
}): DraftPrescriptionLine => {
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
    prescribedQuantity: 0,
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
      itemDirections: [],
    },

    stockLine,
  };
};

export const createDraftPrescriptionLine = ({
  invoiceLine,
  stockLine,
  invoiceStatus,
}: DraftPrescriptionLineSeeds): DraftPrescriptionLine => {
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

  const draftPrescriptionLine = {
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
  return draftPrescriptionLine;
};

export const issuePrescriptionStock = (
  draftPrescriptionLines: DraftPrescriptionLine[],
  idToIssue: string,
  packs: number
) => {
  const foundRowIdx = draftPrescriptionLines.findIndex(
    ({ id }) => id === idToIssue
  );
  const foundRow = draftPrescriptionLines[foundRowIdx];
  if (!foundRow) return draftPrescriptionLines;

  const newDraftPrescriptionLines = [...draftPrescriptionLines];
  newDraftPrescriptionLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: packs,
    isUpdated: true,
  };

  return newDraftPrescriptionLines;
};

export const updateNotes = (
  draftPrescriptionLines: DraftPrescriptionLine[],
  note: string
) => {
  return draftPrescriptionLines.map(line => ({
    ...line,
    note,
    isUpdated: true,
  }));
};

export const issueStock = (
  draftPrescriptionLines: DraftPrescriptionLine[],
  idToIssue: string,
  packs: number
) => {
  const foundRowIdx = draftPrescriptionLines.findIndex(
    ({ id }) => id === idToIssue
  );
  const foundRow = draftPrescriptionLines[foundRowIdx];
  if (!foundRow) return draftPrescriptionLines;

  const newDraftPrescriptionLines = [...draftPrescriptionLines];
  newDraftPrescriptionLines[foundRowIdx] = {
    ...foundRow,
    numberOfPacks: packs,
    isUpdated: true,
  };

  return newDraftPrescriptionLines;
};

export const allocateQuantities =
  (
    status: InvoiceNodeStatus,
    draftPrescriptionLines: DraftPrescriptionLine[]
  ) =>
  (
    newValue: number,
    issuePackSize: number | null,
    allowPartialPacks: boolean = false,
    prescribedQuantity: number | null
  ) => {
    // if invalid quantity entered, don't allocate
    if (newValue < 0 || Number.isNaN(newValue)) {
      return;
    }

    // If there is only one batch row, then it is the placeholder.
    // Assign all of the new value and short circuit.
    const placeholder = draftPrescriptionLines.find(
      ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
    );
    if (
      placeholder &&
      draftPrescriptionLines.length === 1 &&
      status === InvoiceNodeStatus.New
    ) {
      return issueStock(
        draftPrescriptionLines,
        placeholder?.id ?? '',
        newValue * (issuePackSize || 1)
      );
    }

    // calculations are normalised to units
    const totalToAllocate = newValue * (issuePackSize || 1);
    let toAllocate = totalToAllocate;
    const newDraftPrescriptionLines = draftPrescriptionLines.map(batch => ({
      ...batch,
      numberOfPacks: 0,
      isUpdated: batch.numberOfPacks > 0,
    }));

    const validBatches = newDraftPrescriptionLines
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
      newDraftPrescriptionLines,
      toAllocate,
      allowPartialPacks,
    });

    // if there is still a quantity to allocate, run through all stock lines again
    // and round up if necessary to meet or exceed the requested quantity
    if (toAllocate > 0) {
      toAllocate = allocateToBatches({
        validBatches,
        newDraftPrescriptionLines,
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
        newDraftPrescriptionLines,
      });
    }

    //  Prescribed Quantity should only be saved on the first allocated line.
    //  Only one line should have prescribed quantity per item.
    //  If the line with prescribed quantity is deleted or has 0 stock, save it to the next line.
    //  Can be saved against a placeholder if no stock is allocated.
    assignPrescribedQuantity(
      newDraftPrescriptionLines,
      prescribedQuantity,
      placeholder
    );

    if (status === InvoiceNodeStatus.New) {
      const placeholderIdx = newDraftPrescriptionLines.findIndex(
        ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
      );
      const placeholder = newDraftPrescriptionLines[placeholderIdx];
      const oldPlaceholder = draftPrescriptionLines[placeholderIdx];
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

          newDraftPrescriptionLines[placeholderIdx] = {
            ...placeholder,
            numberOfPacks: placeholder.numberOfPacks + toAllocate,
          };
        }
      }
    }

    return newDraftPrescriptionLines;
  };

const allocateToBatches = ({
  validBatches,
  newDraftPrescriptionLines,
  toAllocate,
  roundUp = false,
  allowPartialPacks,
}: {
  validBatches: DraftPrescriptionLine[];
  newDraftPrescriptionLines: DraftPrescriptionLine[];
  toAllocate: number;
  roundUp?: boolean;
  allowPartialPacks: boolean;
}) => {
  validBatches.forEach(batch => {
    const draftPrescriptionLineIdx = newDraftPrescriptionLines.findIndex(
      ({ id }) => batch.id === id
    );
    const draftPrescriptionLine =
      newDraftPrescriptionLines[draftPrescriptionLineIdx];
    if (!draftPrescriptionLine) return null;
    if (toAllocate <= 0) return null;

    const stockLineNode = draftPrescriptionLine.stockLine;
    // note: taking numberOfPacks into account here, because this fn is used
    // a second time to round up the allocation
    const availableUnits =
      Math.floor(
        (stockLineNode?.availableNumberOfPacks ?? 0) -
          draftPrescriptionLine.numberOfPacks
      ) * draftPrescriptionLine.packSize;
    const unitsToAllocate = Math.min(toAllocate, availableUnits);
    const numberOfPacksToAllocate =
      unitsToAllocate / draftPrescriptionLine.packSize;
    const allocatedNumberOfPacks = allowPartialPacks
      ? numberOfPacksToAllocate
      : roundUp
        ? Math.ceil(numberOfPacksToAllocate)
        : Math.floor(numberOfPacksToAllocate);

    toAllocate -= allocatedNumberOfPacks * draftPrescriptionLine.packSize;

    const numberOfPacks =
      draftPrescriptionLine.numberOfPacks + allocatedNumberOfPacks;
    const isUpdated = numberOfPacks > 0;

    newDraftPrescriptionLines[draftPrescriptionLineIdx] = {
      ...draftPrescriptionLine,
      numberOfPacks,
      isUpdated,
    };
  });
  return toAllocate;
};

const reduceBatchAllocation = ({
  toAllocate,
  validBatches,
  newDraftPrescriptionLines,
}: {
  toAllocate: number;
  validBatches: DraftPrescriptionLine[];
  newDraftPrescriptionLines: DraftPrescriptionLine[];
}) => {
  validBatches
    .slice()
    .sort(SortUtils.byExpiryDesc)
    .forEach(batch => {
      const draftPrescriptionLineIdx = newDraftPrescriptionLines.findIndex(
        ({ id }) => batch.id === id
      );
      const draftPrescriptionLine =
        newDraftPrescriptionLines[draftPrescriptionLineIdx];
      if (!draftPrescriptionLine) return null;

      if (draftPrescriptionLine.packSize > toAllocate) return null;
      if (draftPrescriptionLine.numberOfPacks === 0) return null;

      const allocatedUnits =
        draftPrescriptionLine.numberOfPacks * draftPrescriptionLine.packSize;
      const unitsToReduce = Math.min(toAllocate, allocatedUnits);

      const numberOfPacks = Math.floor(
        (allocatedUnits - unitsToReduce) / draftPrescriptionLine.packSize
      );
      toAllocate -= unitsToReduce;

      newDraftPrescriptionLines[draftPrescriptionLineIdx] = {
        ...draftPrescriptionLine,
        numberOfPacks: numberOfPacks,
        isUpdated: numberOfPacks > 0,
      };
    });
  return -toAllocate;
};

export const assignPrescribedQuantity = (
  newDraftPrescriptionLines: DraftPrescriptionLine[],
  prescribedQuantity: number | null,
  placeholder: DraftPrescriptionLine | undefined
) => {
  let prescribedQuantityAssigned = false;

  newDraftPrescriptionLines.forEach(stockOutLine => {
    if (stockOutLine.numberOfPacks > 0 && !prescribedQuantityAssigned) {
      stockOutLine.prescribedQuantity = prescribedQuantity;
      prescribedQuantityAssigned = true;
    } else {
      stockOutLine.prescribedQuantity = 0;
    }
  });

  // If no stock is allocated, assign it to the placeholder stock
  if (!prescribedQuantityAssigned && placeholder) {
    const placeholderIdx = newDraftPrescriptionLines.findIndex(
      ({ type }) => type === InvoiceLineNodeType.UnallocatedStock
    );
    newDraftPrescriptionLines[placeholderIdx] = {
      ...placeholder,
      prescribedQuantity,
    };
  }
};

export const shouldUpdatePlaceholder = (
  quantity: number,
  placeholder: DraftPrescriptionLine
) => quantity > 0 && !placeholder.isCreated;

export const UnitQuantityCell = (props: CellProps<DraftPrescriptionLine>) => (
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

export const PackQuantityCell = (props: CellProps<DraftPrescriptionLine>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.stockLine?.availableNumberOfPacks}
    id={getPackQuantityCellId(props.rowData.stockLine?.batch)}
    decimalLimit={2}
    min={0}
  />
);
