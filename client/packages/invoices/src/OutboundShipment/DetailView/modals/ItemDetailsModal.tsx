import React, { useEffect, useState } from 'react';

import {
  DialogButton,
  Grid,
  Item,
  useForm,
  useDialog,
  FormProvider,
  generateUUID,
} from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { BatchesTable } from './BatchesTable';
import { ItemDetailsForm } from './ItemDetailsForm';
import {
  BatchRow,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
} from '../types';

interface ItemDetailsModalProps {
  summaryItem: OutboundShipmentSummaryItem | null;
  invoiceLine?: OutboundShipmentRow;
  isOpen: boolean;
  onClose: () => void;
  upsertInvoiceLine: (invoiceLine: OutboundShipmentRow) => void;
  onChangeItem: (item: Item | null) => void;
}

export const getInvoiceLine = (
  id: string,
  summaryItem: OutboundShipmentSummaryItem,
  stockLineOrPlaceholder: Partial<BatchRow> & { id: string },
  quantity: number
): OutboundShipmentRow => ({
  id,
  numberOfPacks: quantity,
  quantity,
  invoiceId: '',
  itemId: summaryItem.itemId,
  itemName: summaryItem.itemName,
  itemCode: summaryItem.itemCode,
  itemUnit: summaryItem.itemUnit ?? '',
  batch: stockLineOrPlaceholder.batch ?? '',
  locationDescription: stockLineOrPlaceholder.locationDescription ?? '',
  costPricePerPack: stockLineOrPlaceholder.costPricePerPack ?? 0,
  sellPricePerPack: stockLineOrPlaceholder.sellPricePerPack ?? 0,
  stockLineId: stockLineOrPlaceholder.id,
  packSize: stockLineOrPlaceholder.packSize ?? 1,
  expiryDate: stockLineOrPlaceholder.expiryDate ?? null,
  note: stockLineOrPlaceholder?.note ?? '',
});

const sortByDisabledThenExpiryDate = (a: BatchRow, b: BatchRow) => {
  const disabledA = a.onHold || a.availableNumberOfPacks === 0;
  const disabledB = b.onHold || b.availableNumberOfPacks === 0;
  if (!disabledA && disabledB) {
    return -1;
  }
  if (disabledA && !disabledB) {
    return 1;
  }

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

const createPlaceholderRow = (): BatchRow => ({
  availableNumberOfPacks: 0,
  batch: 'Placeholder',
  costPricePerPack: 0,
  id: 'placeholder',
  itemId: 'placeholder',
  onHold: false,
  packSize: 1,
  sellPricePerPack: 0,
  storeId: '',
  totalNumberOfPacks: 0,
  quantity: 0,
});

const useBatchRows = (summaryItem: OutboundShipmentSummaryItem | null) => {
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const { data, isLoading } = useStockLines(summaryItem?.itemCode ?? '');

  useEffect(() => {
    if (!summaryItem) {
      return setBatchRows([]);
    }

    if (!data) return;

    setBatchRows(() => {
      const rows = data
        .map(batch => {
          const matchingInvoiceRow = summaryItem.batches.find(
            ({ stockLineId }) => stockLineId === batch.id
          );
          return { ...batch, quantity: matchingInvoiceRow?.numberOfPacks ?? 0 };
        })
        .sort(sortByDisabledThenExpiryDate);
      rows.push(createPlaceholderRow());

      return rows;
    });
  }, [data]);

  return { batchRows, isLoading, setBatchRows };
};

export type PackSizeController = ReturnType<typeof usePackSizeController>;

const usePackSizeController = (batches: { packSize: number }[]) => {
  // Creating a sorted array of distinct pack sizes
  const packSizes = Array.from(
    new Set(
      batches
        .reduce((sizes, { packSize }) => [...sizes, packSize], [] as number[])
        .sort()
    )
  );

  const options = packSizes.map(packSize => ({
    label: String(packSize),
    value: packSize,
  }));

  const defaultPackSize = options[0] ?? { label: '1', value: 1 };

  const [selected, setSelected] = useState(defaultPackSize);

  const setPackSize = (newValue: number) => {
    const packSizeOption = options.find(({ value }) => value === newValue);
    if (!packSizeOption) return;
    setSelected(packSizeOption);
  };

  return { selected, setPackSize, options };
};

const sumAvailableQuantity = (batchRows: BatchRow[]) => {
  const sum = batchRows.reduce(
    (acc, { availableNumberOfPacks, packSize }) =>
      acc + availableNumberOfPacks * packSize,
    0
  );

  return sum;
};

const getAllocatedQuantity = (batchRows: BatchRow[]) => {
  return batchRows.reduce((acc, { quantity }) => acc + quantity, 0);
};

const issueStock = (
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
    quantity: value,
  };

  return newBatchRows;
};

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  upsertInvoiceLine,
  onChangeItem,
  summaryItem,
}) => {
  const methods = useForm({ mode: 'onBlur' });
  const { reset, register, setValue, getValues } = methods;

  const { batchRows, setBatchRows, isLoading } = useBatchRows(summaryItem);
  const packSizeController = usePackSizeController(batchRows);

  const { hideDialog, showDialog, Modal } = useDialog({
    title: 'heading.add-item',
    onClose,
  });

  const onReset = () => {
    reset();
    setValue('quantity', '');
  };
  const onCancel = () => {
    onClose();
    onReset();
  };
  const upsert = () => {
    if (!summaryItem) return;

    const values = getValues();
    const invoiceLines = batchRows.map(batch =>
      getInvoiceLine(
        generateUUID(),
        summaryItem,
        batch,
        Number(values[batch.id] || 0)
      )
    );

    invoiceLines
      .filter(line => line.numberOfPacks > 0)
      .forEach(upsertInvoiceLine);
    const placeholderValue = Number(values['placeholder'] || 0);
    if (placeholderValue > 0) {
      invoiceLines.push(
        getInvoiceLine(
          'placeholder',
          summaryItem,
          { id: 'placeholder', expiryDate: '' },
          placeholderValue
        )
      );
    }
    onReset();
  };
  const upsertAndClose = () => {
    upsert();
    onClose();
    onReset();
  };

  const allocateQuantities = (newValue: number, issuePackSize: number) => {
    setValue('quantity', String(newValue));
    // if invalid quantity entered, don't allocate
    if (newValue < 1 || Number.isNaN(newValue)) {
      return;
    }
    // If there is only one batch row, then it is the placeholder.
    // Assign all of the new value and short circuit.
    if (batchRows.length === 1) {
      setBatchRows(
        issueStock(batchRows, 'placeholder', newValue * issuePackSize)
      );
    }

    // calculations are normalised to units
    let toAllocate = newValue * issuePackSize;

    const newBatchRows = [...batchRows];
    const validBatches = newBatchRows.filter(
      ({ packSize, onHold, availableNumberOfPacks }) =>
        packSize === issuePackSize && availableNumberOfPacks > 0 && !onHold
    );

    validBatches.forEach(batch => {
      const batchRowIdx = newBatchRows.findIndex(({ id }) => batch.id === id);
      const batchRow = newBatchRows[batchRowIdx];
      if (!batchRow) return null;

      const availableUnits = batch.availableNumberOfPacks * batch.packSize;
      const allocatedUnits = Math.min(toAllocate, availableUnits);
      const allocatedNumberOfPacks = Math.floor(
        allocatedUnits / batch.packSize
      );

      toAllocate -= allocatedUnits;

      newBatchRows[batchRowIdx] = {
        ...batchRow,
        quantity: allocatedNumberOfPacks,
      };
    });

    const placeholderIdx = newBatchRows.findIndex(
      ({ id }) => id === 'placeholder'
    );
    const placeholder = newBatchRows[placeholderIdx];

    if (!placeholder) throw new Error('No placeholder within item editing');

    newBatchRows[placeholderIdx] = {
      ...placeholder,
      quantity: toAllocate,
    };

    setBatchRows(newBatchRows);
  };

  const onChangeRowQuantity = (batchId: string, value: number) => {
    setBatchRows(issueStock(batchRows, batchId, value));
  };

  React.useEffect(() => {
    if (isOpen) showDialog();
    else hideDialog();
  }, [isOpen]);

  return (
    <Modal
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton variant="next" onClick={upsert} disabled={true} />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={upsertAndClose}
          disabled={getAllocatedQuantity(batchRows) <= 0}
        />
      }
      height={600}
      width={900}
    >
      <FormProvider {...methods}>
        <form>
          <Grid container gap={0.5}>
            <ItemDetailsForm
              availableQuantity={sumAvailableQuantity(batchRows)}
              packSizeController={packSizeController}
              onChangeItem={onChangeItem}
              onChangeQuantity={(newQuantity, newPackSize) =>
                allocateQuantities(newQuantity, newPackSize)
              }
              register={register}
              allocatedQuantity={getAllocatedQuantity(batchRows)}
              summaryItem={summaryItem || undefined}
            />
            {!isLoading && (
              <BatchesTable
                onChange={onChangeRowQuantity}
                register={register}
                rows={batchRows}
              />
            )}
          </Grid>
        </form>
      </FormProvider>
    </Modal>
  );
};
