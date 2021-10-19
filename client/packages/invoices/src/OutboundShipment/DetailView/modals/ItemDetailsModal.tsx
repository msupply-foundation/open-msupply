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

const listQueryFn = async (): Promise<Item[]> => {
  const { items } = await request(
    Environment.API_URL,
    gql`
      query items {
        items {
          data {
            id
            isVisible
            name
            code
            availableQuantity
            availableBatches {
              nodes {
                id
                batch
                expiryDate
                packSize
                costPricePerPack
                sellPricePerPack
                availableNumberOfPacks
                totalNumberOfPacks
              }
            }
          }
        }
      }
    `
  );

  return items.data;
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
  const [lines, setLines] = React.useState<InvoiceLine[]>(
    invoiceLine ? [invoiceLine] : []
  );
  const { hideDialog, showDialog, Modal } = useDialog({
    title: 'heading.add-item',
  });
  const methods = useForm({ mode: 'onBlur' });
  const {
    formState: { isDirty, isValid },
    reset,
    handleSubmit,
    register,
    setValue,
    trigger,
  } = methods;

  const onChangeItem = (
    _event: SyntheticEvent<Element, Event>,
    value: Item | null
  ) => {
    if (value?.id && value?.id !== selectedItem?.id) setLines([]);
    setSelectedItem(value);
    setBatchRows(
      (selectedItem?.availableBatches.nodes || [])
        .map(batch => ({ ...batch, quantity: 0 }))
        .sort(sortByExpiryDate)
    );
    setValue('itemId', value?.id || '');
    setValue('code', value?.code || '');
    trigger('itemId');
  };

  const { data, isLoading } = useQuery(['item', 'list'], listQueryFn);
  const onCancel = () => {
    hideDialog();
    onClose();
    reset();
    setBatchRows([]);
  };
  const upsert = () => {
    lines.forEach(upsertInvoiceLine);
    reset();
    setBatchRows([]);
  };
  const upsertAndClose = () => {
    upsert();
    onClose();
    hideDialog();
    reset();
    setBatchRows([]);
  };
  const onSubmit = handleSubmit(upsertAndClose);
  const onOkNext = handleSubmit(upsert);

  const onChangeInvoiceLine = (invoiceLine: InvoiceLine) => {
    const newLines = lines.filter(
      line => line.stockLineId !== invoiceLine.stockLineId
    );
    newLines.push(invoiceLine);
    setLines(newLines);
  };

  React.useEffect(() => {
    if (isOpen) showDialog();
  }, [isOpen]);

  React.useEffect(() => {
    const allocatedQuantity = lines.reduce(
      (total, line) => (total += line.quantity),
      0
    );
    setValue('allocated', allocatedQuantity >= quantity);
    trigger('allocated');
  }, [lines, quantity]);

  React.useEffect(() => {
    let toAllocate = quantity;
    if (quantity === 0 || batchRows.length === 0) return;
    batchRows.forEach(batch => {
      batch.quantity = Math.min(
        toAllocate,
        batch.availableNumberOfPacks * batch.packSize
      );
      toAllocate -= batch.quantity;
      setValue(batch.id, batch.quantity);
    });
    setValue('placeholder', toAllocate);
  }, [quantity, selectedItem]);

  register('allocated', { required: true });
  return (
    <Modal
      cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
      nextButton={
        <DialogButton
          variant="next"
          onClick={onOkNext}
          disabled={!isDirty || !isValid}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={onSubmit}
          disabled={!isDirty || !isValid}
        />
      }
      height={600}
      width={780}
    >
      <FormProvider {...methods}>
        {' '}
        <form onSubmit={onSubmit}>
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
              onChange={onChangeInvoiceLine}
              register={register}
              rows={batchRows}
            />
          </Grid>
        </form>
      </FormProvider>
    </Modal>
  );
};
