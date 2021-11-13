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

const useBatchRows = (summaryItem: OutboundShipmentSummaryItem | null) => {
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const { data, isLoading } = useStockLines(summaryItem?.itemCode ?? '');

  useEffect(() => {
    if (!summaryItem) {
      return setBatchRows([]);
    }

    if (!data) return;

    setBatchRows(() => {
      return data
        .map(batch => {
          const matchingInvoiceRow = summaryItem.batches.find(
            ({ stockLineId }) => stockLineId === batch.id
          );
          return { ...batch, quantity: matchingInvoiceRow?.numberOfPacks ?? 0 };
        })
        .sort(sortByDisabledThenExpiryDate);
    });
  }, [data]);

  return { batchRows, isLoading };
};

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  upsertInvoiceLine,
  onChangeItem,
  summaryItem,
}) => {
  const [quantity, setQuantity] = useState(0);
  const [allocated, setAllocated] = useState(0);
  const [packSize, setPackSize] = useState(1);

  const methods = useForm({ mode: 'onBlur' });
  const { reset, register, setValue, getValues } = methods;

  const { batchRows, isLoading } = useBatchRows(summaryItem);

  const { hideDialog, showDialog, Modal } = useDialog({
    title: 'heading.add-item',
    onClose,
  });

  const onReset = () => {
    reset();
    setQuantity(0);

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

  const checkAllocatedQuantities = () => {
    const values = getValues();
    const allocatedUnits = batchRows.reduce(
      (total, batch) =>
        (total += Number(values[batch.id] || 0) * batch.packSize),
      Number(values['placeholder'] || 0)
    );

    setAllocated(Math.floor(allocatedUnits / packSize));
  };

  const allocateQuantities = () => {
    // if invalid quantity entered, don't allocate
    if (quantity < 1 || Number.isNaN(quantity) || !summaryItem) {
      return;
    }
    // if the selected item has no batch rows, allocate all to the placeholder
    if (batchRows.length === 0) {
      setValue('placeholder', quantity);
      setAllocated(quantity);
      return;
    }

    // calculations are normalised to units
    let toAllocate = quantity * packSize;
    let batchAllocation = 0;

    batchRows.forEach(batch => {
      batchAllocation = 0;
      // skip bigger pack sizes
      const validBatch =
        batch.packSize <= packSize &&
        batch.availableNumberOfPacks > 0 &&
        !batch.onHold;

      if (validBatch) {
        const allocatedUnits = Math.min(
          toAllocate,
          batch.availableNumberOfPacks * batch.packSize
        );

        batchAllocation = Math.floor(allocatedUnits / batch.packSize);
        toAllocate -= batchAllocation * batch.packSize;
      }

      setValue(batch.id, batchAllocation);
      setValue(`${batch.id}_total`, batchAllocation * batch.packSize);
    });

    // allocate remainder to placeholder
    setValue('placeholder', toAllocate);
    setAllocated(quantity);
  };

  const onChangeRowQuantity = (
    key: string,
    value: number,
    packSize: number
  ) => {
    setValue(key, value);
    setValue(`${key}_total`, value * packSize);
    checkAllocatedQuantities();
  };

  React.useEffect(() => {
    if (isOpen) showDialog();
    else hideDialog();
  }, [isOpen]);

  React.useEffect(checkAllocatedQuantities, [batchRows]);

  React.useEffect(allocateQuantities, [quantity, summaryItem, packSize]);

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
          disabled={allocated < quantity || allocated === 0}
        />
      }
      height={600}
      width={900}
    >
      <FormProvider {...methods}>
        <form>
          <Grid container gap={0.5}>
            <ItemDetailsForm
              onChangeItem={onChangeItem}
              onChangeQuantity={setQuantity}
              register={register}
              allocatedQuantity={allocated}
              quantity={quantity}
              summaryItem={summaryItem || undefined}
              packSize={packSize}
              setPackSize={setPackSize}
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
