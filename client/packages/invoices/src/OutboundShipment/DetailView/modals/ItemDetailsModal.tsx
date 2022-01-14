import React, { useEffect, useState } from 'react';

import {
  DialogButton,
  Grid,
  Item,
  useForm,
  useDialog,
  FormProvider,
  InlineSpinner,
  Box,
  useTranslation,
  InvoiceNodeStatus,
  ifTheSameElseDefault,
  // useBufferState,
} from '@openmsupply-client/common';
import { useStockLines } from '@openmsupply-client/system';
import { BatchesTable, sortByExpiry, sortByExpiryDesc } from './BatchesTable';
import { ItemDetailsForm } from './ItemDetailsForm';
import {
  BatchRow,
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentSummaryItem,
} from '../../../types';

interface ItemDetailsModalProps {
  summaryItem: OutboundShipmentSummaryItem | null;
  invoiceLine?: OutboundShipmentRow;
  isOpen: boolean;
  onClose: () => void;
  upsertInvoiceLine: (invoiceLine: OutboundShipmentRow) => void;
  onChangeItem: (item: Item | null) => void;
  onNext: () => void;
  isEditMode: boolean;
  isOnlyItem: boolean;
  draft: OutboundShipment;
  item: Item | null;
}

export const getInvoiceLine = (
  id: string,
  summaryItem: OutboundShipmentSummaryItem,
  stockLineOrPlaceholder: Partial<BatchRow> & { id: string },
  numberOfPacks: number
): OutboundShipmentRow => ({
  id,
  numberOfPacks,
  invoiceId: '',
  itemId: summaryItem.itemId,
  itemName: summaryItem.itemName,
  itemCode: summaryItem.itemCode,
  // itemUnit: summaryItem.itemUnit ?? '',
  batch: stockLineOrPlaceholder.batch ?? '',
  locationName: stockLineOrPlaceholder.locationName ?? '',
  costPricePerPack: stockLineOrPlaceholder.costPricePerPack ?? 0,
  sellPricePerPack: stockLineOrPlaceholder.sellPricePerPack ?? 0,
  stockLineId: stockLineOrPlaceholder.id,
  packSize: stockLineOrPlaceholder.packSize ?? 1,
  expiryDate: stockLineOrPlaceholder.expiryDate
    ? new Date(stockLineOrPlaceholder.expiryDate)
    : null,
  note: stockLineOrPlaceholder?.note ?? '',
});

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
  numberOfPacks: 0,
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
          const matchingInvoiceRow = Object.values(summaryItem.batches).find(
            ({ stockLineId }) => stockLineId === batch.id
          );
          return {
            ...batch,
            numberOfPacks: matchingInvoiceRow?.numberOfPacks ?? 0,
            availableNumberOfPacks:
              batch.availableNumberOfPacks +
              (matchingInvoiceRow?.numberOfPacks ?? 0),
          };
        })
        .sort(sortByExpiry);

      rows.push(createPlaceholderRow());
      return rows;
    });
  }, [data]);

  return { batchRows, isLoading, setBatchRows };
};

export type PackSizeController = ReturnType<typeof usePackSizeController>;

const usePackSizeController = (
  batches: {
    packSize: number;
    onHold: boolean;
    availableNumberOfPacks: number;
    numberOfPacks: number;
  }[]
) => {
  const t = useTranslation('distribution');
  // Creating a sorted array of distinct pack sizes
  const packSizes = Array.from(
    new Set(
      batches
        .filter(
          ({ onHold, availableNumberOfPacks }) =>
            availableNumberOfPacks > 0 && !onHold
        )
        .reduce((sizes, { packSize }) => [...sizes, packSize], [] as number[])
        .sort((a, b) => a - b)
    )
  );

  const anySize = [];
  if (packSizes.length > 1) {
    anySize.push({ label: t('label.any'), value: -1 });
  }

  const options = anySize.concat(
    packSizes.map(packSize => ({
      label: String(packSize),
      value: packSize,
    }))
  );

  const [selected, setSelected] = useState({ label: '', value: 0 });

  const setPackSize = (newValue: number) => {
    const packSizeOption = options.find(({ value }) => value === newValue);
    if (!packSizeOption) return;
    setSelected(packSizeOption);
  };

  useEffect(() => {
    if (selected.value !== 0) return;

    const selectedPackSize = ifTheSameElseDefault(
      batches.filter(batch => batch.numberOfPacks > 0),
      'packSize',
      0
    );

    const defaultPackSize = (selectedPackSize === 0
      ? options[0]
      : options.find(option => option.value === selectedPackSize)) ?? {
      label: '',
      value: '',
    };

    if (defaultPackSize.value && typeof defaultPackSize.value == 'number') {
      setPackSize(defaultPackSize.value);
    }
    if (packSizes.length === 0) {
      setSelected({ label: '', value: 0 });
    }
  }, [batches]);

  const reset = () => setSelected({ label: '', value: 0 });

  return { selected, setPackSize, options, reset };
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
  return batchRows.reduce(
    (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
    0
  );
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
    numberOfPacks: value,
  };

  return newBatchRows;
};

const allocateQuantities =
  (
    draft: OutboundShipment,
    batchRows: BatchRow[],
    setBatchRows: React.Dispatch<React.SetStateAction<BatchRow[]>>
  ) =>
  (newValue: number, issuePackSize: number | null) => {
    // if invalid quantity entered, don't allocate
    if (newValue < 1 || Number.isNaN(newValue)) {
      return;
    }

    // If there is only one batch row, then it is the placeholder.
    // Assign all of the new value and short circuit.
    if (batchRows.length === 1) {
      setBatchRows(
        issueStock(batchRows, 'placeholder', newValue * (issuePackSize || 1))
      );
    }

    // calculations are normalised to units
    const totalToAllocate = newValue * (issuePackSize || 1);
    let toAllocate = totalToAllocate;

    const newBatchRows = batchRows.map(batch => ({
      ...batch,
      numberOfPacks: 0,
    }));
    const validBatches = newBatchRows
      .filter(
        ({ packSize, onHold, availableNumberOfPacks }) =>
          (issuePackSize ? packSize === issuePackSize : true) &&
          availableNumberOfPacks > 0 &&
          !onHold
      )
      .sort(sortByExpiry);

    validBatches.forEach(batch => {
      const batchRowIdx = newBatchRows.findIndex(({ id }) => batch.id === id);
      const batchRow = newBatchRows[batchRowIdx];
      if (!batchRow) return null;
      if (toAllocate < 0) return null;

      const availableUnits =
        batchRow.availableNumberOfPacks * batchRow.packSize;
      const unitsToAllocate = Math.min(toAllocate, availableUnits);
      const allocatedNumberOfPacks = Math.ceil(
        unitsToAllocate / batchRow.packSize
      );

      toAllocate -= allocatedNumberOfPacks * batchRow.packSize;

      newBatchRows[batchRowIdx] = {
        ...batchRow,
        numberOfPacks: allocatedNumberOfPacks,
      };
    });

    // if over-allocated due to pack sizes available, reduce allocation as needed
    if (toAllocate < 0) {
      toAllocate *= -1;
      validBatches.sort(sortByExpiryDesc).forEach(batch => {
        const batchRowIdx = newBatchRows.findIndex(({ id }) => batch.id === id);
        const batchRow = newBatchRows[batchRowIdx];
        if (!batchRow) return null;
        if (batchRow.packSize > toAllocate) return null;
        if (batchRow.numberOfPacks === 0) return null;

        const allocatedUnits = batchRow.numberOfPacks * batchRow.packSize;
        const unitsToReduce = Math.min(toAllocate, allocatedUnits);
        const numberOfPacks = Math.floor(
          (allocatedUnits - unitsToReduce) / batchRow.packSize
        );

        toAllocate -= unitsToReduce;

        newBatchRows[batchRowIdx] = {
          ...batchRow,
          numberOfPacks: numberOfPacks,
        };
      });
    }

    if (draft.status === InvoiceNodeStatus.New) {
      const placeholderIdx = newBatchRows.findIndex(
        ({ id }) => id === 'placeholder'
      );
      const placeholder = newBatchRows[placeholderIdx];

      if (!placeholder) throw new Error('No placeholder within item editing');

      newBatchRows[placeholderIdx] = {
        ...placeholder,
        numberOfPacks:
          placeholder.numberOfPacks + toAllocate * (issuePackSize || 1),
      };
    }

    setBatchRows(newBatchRows);
  };

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  onChangeItem,
  summaryItem,
  onNext,
  isEditMode,
  isOnlyItem,
  draft,
  // item,
}) => {
  // const [currentItem, setCurrentItem] = useBufferState(item);
  const t = useTranslation(['distribution']);
  const methods = useForm({ mode: 'onBlur' });
  const { register } = methods;

  const { batchRows, setBatchRows, isLoading } = useBatchRows(summaryItem);
  const packSizeController = usePackSizeController(batchRows);
  const { Modal } = useDialog({ isOpen, onClose });

  const onChangeRowQuantity = (batchId: string, value: number) => {
    setBatchRows(issueStock(batchRows, batchId, value));
  };

  return (
    <Modal
      title={t(isEditMode ? 'heading.edit-item' : 'heading.add-item')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={isEditMode && isOnlyItem}
          variant="next"
          onClick={onNext}
        />
      }
      okButton={<DialogButton variant="ok" onClick={onClose} />}
      height={600}
      width={900}
    >
      <FormProvider {...methods}>
        <form>
          <Grid container gap={0.5}>
            <ItemDetailsForm
              draft={draft}
              availableQuantity={sumAvailableQuantity(batchRows)}
              packSizeController={packSizeController}
              onChangeItem={onChangeItem}
              onChangeQuantity={(newQuantity, newPackSize) =>
                allocateQuantities(
                  draft,
                  batchRows,
                  setBatchRows
                )(newQuantity, newPackSize)
              }
              register={register}
              allocatedQuantity={getAllocatedQuantity(batchRows)}
              summaryItem={summaryItem || undefined}
            />
            {!!summaryItem ? (
              !isLoading ? (
                <BatchesTable
                  packSizeController={packSizeController}
                  onChange={onChangeRowQuantity}
                  register={register}
                  rows={batchRows}
                  invoiceStatus={draft.status}
                />
              ) : (
                <Box
                  display="flex"
                  flex={1}
                  height={300}
                  justifyContent="center"
                  alignItems="center"
                >
                  <InlineSpinner />
                </Box>
              )
            ) : null}
          </Grid>
        </form>
      </FormProvider>
    </Modal>
  );
};
