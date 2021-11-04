import React, { SyntheticEvent } from 'react';

import {
  DialogButton,
  Grid,
  InvoiceLine,
  Item,
  getSdk,
  GraphQLClient,
  useForm,
  useQuery,
  useDialog,
  FormProvider,
  SortBy,
  ItemSortFieldInput,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
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

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

const listQueryFn = async ({
  first = 999,
  offset,
  sortBy,
}: {
  first?: number;
  offset?: number;
  sortBy?: SortBy<Item>;
} = {}): Promise<{
  nodes: Item[];
  totalCount: number;
}> => {
  // TODO: Need to add a `sortByKey` to the Column type
  const key =
    sortBy?.key === 'name' ? ItemSortFieldInput.Name : ItemSortFieldInput.Code;

  const { items } = await api.items({
    first,
    offset,
    key,
    desc: sortBy?.isDesc,
  });

  if (items.__typename === 'ItemConnector') {
    const itemRows: Item[] = items.nodes.map(item => ({
      ...item,
      unit: '',
      availableBatches:
        item.availableBatches.__typename === 'StockLineConnector'
          ? item.availableBatches.nodes
          : [],
    }));

    return {
      totalCount: items.totalCount,
      nodes: itemRows,
    };
  }
  throw new Error(items.error.description);
};

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

  const onChangeItem = (
    _event: SyntheticEvent<Element, Event>,
    value: Item | null
  ) => {
    setSelectedItem(value);
    setBatchRows(
      (value?.availableBatches || [])
        .map(batch => ({ ...batch, quantity: 0 }))
        .sort(sortByDisabledThenExpiryDate)
    );
    setValue('code', value?.code || '');
    setValue('unit', value?.unit || '');
    setValue('availableQuantity', value?.availableQuantity || 0);
  };

  const { data, isLoading } = useQuery(['item', 'list'], () => listQueryFn());

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
              items={data?.nodes ?? []}
              onChangeItem={onChangeItem}
              onChangeQuantity={setQuantity}
              register={register}
              isLoading={isLoading}
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
