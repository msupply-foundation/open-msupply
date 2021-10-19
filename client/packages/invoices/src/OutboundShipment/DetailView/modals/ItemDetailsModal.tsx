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

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  invoiceLine,
  isOpen,
  onClose,
  upsertInvoiceLine,
}) => {
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
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
    setValue('itemId', value?.id || '');
    setValue('code', value?.code || '');
    trigger('itemId');
  };

  const { data, isLoading } = useQuery(['item', 'list'], listQueryFn);
  const onCancel = () => {
    hideDialog();
    onClose();
    reset();
  };
  const upsert = () => {
    lines.forEach(upsertInvoiceLine);
    reset();
  };
  const upsertAndClose = () => {
    upsert();
    onClose();
    hideDialog();
    reset();
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
              register={register}
              isLoading={isLoading}
            />
            <BatchesTable
              item={selectedItem}
              onChange={onChangeInvoiceLine}
              register={register}
            />
          </Grid>
        </form>
      </FormProvider>
    </Modal>
  );
};
