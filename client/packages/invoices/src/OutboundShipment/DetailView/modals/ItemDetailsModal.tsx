import React from 'react';

import {
  DialogButton,
  Grid,
  InvoiceLine,
  Item,
  useForm,
  useDialog,
  FormProvider,
} from '@openmsupply-client/common';

import { BatchesTable } from './BatchesTable';
import { ItemDetailsForm } from './ItemDetailsForm';
import { BatchRow } from '../types';

interface ItemDetailsModalProps {
  invoiceLine?: InvoiceLine;
  isOpen: boolean;
  onClose: () => void;
  upsertInvoiceLine: (invoiceLine: InvoiceLine) => void;
}

export const getInvoiceLine = (
  id: string,
  item: Item,
  line: { id: string; expiryDate?: string | null },
  quantity: number
): InvoiceLine => ({
  id,
  itemId: '',
  itemName: item.name,
  itemCode: '',
  itemUnit: '',
  packSize: 0,
  numberOfPacks: 0,
  costPricePerPack: 0,
  sellPricePerPack: 0,
  stockLineId: line.id,
  quantity,
  invoiceId: '',
  expiry: line.expiryDate,
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

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  invoiceLine,
  isOpen,
  onClose,
  upsertInvoiceLine,
}) => {
  const [batchRows, setBatchRows] = React.useState<BatchRow[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  const [quantity, setQuantity] = React.useState(0);
  const [allocated, setAllocated] = React.useState(0);
  const [packSize, setPackSize] = React.useState(1);

  const { hideDialog, showDialog, Modal } = useDialog({
    title: 'heading.add-item',
    onClose,
  });
  const methods = useForm({ mode: 'onBlur' });
  const { reset, register, setValue, getValues } = methods;

  const onChangeItem = (value: Item | null) => {
    setSelectedItem(value);
    setBatchRows(
      (value?.availableBatches || [])
        .map(batch => ({ ...batch, quantity: 0 }))
        .sort(sortByDisabledThenExpiryDate)
    );
    setValue('code', value?.code || '');
    setValue('unitName', value?.unitName || '');
    setValue('availableQuantity', value?.availableQuantity || 0);
  };

  const onReset = () => {
    reset();
    setBatchRows([]);
    setQuantity(0);
    setSelectedItem(null);
    setValue('quantity', '');
  };
  const onCancel = () => {
    onClose();
    onReset();
  };
  const upsert = () => {
    if (!selectedItem) return;

    const values = getValues();
    const invoiceLines = batchRows.map(batch =>
      getInvoiceLine('', selectedItem, batch, Number(values[batch.id] || 0))
    );
    invoiceLines
      .filter(line => line.numberOfPacks > 0)
      .forEach(upsertInvoiceLine);
    const placeholderValue = Number(values['placeholder'] || 0);
    if (placeholderValue > 0) {
      invoiceLines.push(
        getInvoiceLine(
          'placeholder',
          selectedItem,
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
    if (quantity < 1 || Number.isNaN(quantity) || !selectedItem) {
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

  React.useEffect(allocateQuantities, [quantity, selectedItem, packSize]);

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
              invoiceLine={invoiceLine}
              onChangeItem={onChangeItem}
              onChangeQuantity={setQuantity}
              register={register}
              allocatedQuantity={allocated}
              quantity={quantity}
              selectedItem={selectedItem || undefined}
              packSize={packSize}
              setPackSize={setPackSize}
            />
            <BatchesTable
              item={selectedItem}
              onChange={onChangeRowQuantity}
              register={register}
              rows={batchRows}
            />
          </Grid>
        </form>
      </FormProvider>
    </Modal>
  );
};
