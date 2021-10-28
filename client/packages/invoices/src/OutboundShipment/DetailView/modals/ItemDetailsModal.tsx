import React, { SyntheticEvent } from 'react';

import {
  DialogButton,
  Grid,
  InvoiceLine,
  Item,
  gql,
  request,
  useForm,
  useQuery,
  useDialog,
  FormProvider,
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
  line: { id: string; expiryDate: string },
  quantity: number
): InvoiceLine => ({
  id,
  itemName: item.name,
  stockLineId: line.id,
  itemCode: item.code,
  quantity,
  invoiceId: '',
  expiry: line.expiryDate,
});

const listQueryFn = async (): Promise<Item[]> => {
  const { items } = await request(
    Environment.API_URL,
    gql`
      query items {
        items {
          ... on ItemConnector {
            nodes {
              id
              code
              availableBatches {
                ... on StockLineConnector {
                  nodes {
                    availableNumberOfPacks
                    batch
                    costPricePerPack
                    expiryDate
                    id
                    itemId
                    packSize
                    sellPricePerPack
                    storeId
                    totalNumberOfPacks
                  }
                }
                ... on ConnectorError {
                  __typename
                  error {
                    description
                  }
                }
              }
              isVisible
              name
            }
          }
        }
      }
    `
  );

  return items.nodes;
};

const sortByExpiryDate = (a: BatchRow, b: BatchRow) => {
  const expiryA = new Date(a.expiryDate);
  const expiryB = new Date(b.expiryDate);

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
  const [isAllocated, setIsAllocated] = React.useState(false);

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
      (selectedItem?.availableBatches.nodes || [])
        .map(batch => ({ ...batch, quantity: 0 }))
        .sort(sortByExpiryDate)
    );
    setValue('code', value?.code || '');
  };

  const { data, isLoading } = useQuery(['item', 'list'], listQueryFn);
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
    invoiceLines.filter(line => line.quantity > 0).forEach(upsertInvoiceLine);
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
    const allocatedQuantity = batchRows.reduce(
      (total, batch) => (total += Number(values[batch.id] || 0)),
      Number(values['placeholder'] || 0)
    );

    setIsAllocated(allocatedQuantity >= quantity && allocatedQuantity > 0);
  };

  const allocateQuantities = () => {
    // if invalid quantity entered, don't allocate
    if (quantity < 1 || Number.isNaN(quantity)) {
      return;
    }
    // if the selected item has no batch rows, allocate all to the placeholder
    if (batchRows.length === 0) {
      setValue('placeholder', quantity);
      setIsAllocated(true);
      return;
    }

    let toAllocate = 0;
    toAllocate += quantity;

    batchRows.forEach(batch => {
      const allocatedQuantity = Math.min(
        toAllocate,
        batch.availableNumberOfPacks * batch.packSize
      );
      toAllocate -= allocatedQuantity;
      setValue(batch.id, allocatedQuantity);
    });
    // allocate remainder to placeholder
    setValue('placeholder', toAllocate);
    setIsAllocated(true);
  };

  const onChangeRowQuantity = (key: string, value: number) => {
    setValue(key, value);
    checkAllocatedQuantities();
  };

  React.useEffect(() => {
    if (isOpen) showDialog();
    else hideDialog();
  }, [isOpen]);

  React.useEffect(checkAllocatedQuantities, [batchRows]);

  React.useEffect(allocateQuantities, [quantity, selectedItem]);

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
          disabled={!isAllocated}
        />
      }
      height={600}
      width={780}
    >
      <FormProvider {...methods}>
        <form>
          <Grid container gap={0.5}>
            <ItemDetailsForm
              invoiceLine={invoiceLine}
              items={data}
              onChangeItem={onChangeItem}
              onChangeQuantity={setQuantity}
              register={register}
              isLoading={isLoading}
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
