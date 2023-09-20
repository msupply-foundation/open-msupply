import React, { useEffect, useState } from 'react';
import {
  Typography,
  DialogButton,
  Grid,
  useDialog,
  InlineSpinner,
  Box,
  useTranslation,
  ModalMode,
  useBufferState,
  useDirtyCheck,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  useKeyboardHeightAdjustment,
  InvoiceLineNodeType,
  useNotification,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { OutboundLineEditForm } from './OutboundLineEditForm';
import { useDraftOutboundLines, useNextItem } from './hooks';
import { useOutbound } from '../../api';
import { getPackQuantityCellId } from '../../../utils';
import { Draft, DraftItem } from '../../..';
import {
  PackSizeController,
  allocateQuantities,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft | null;
  mode: ModalMode | null;
}

const useFocusNumberOfPacksInput = (draft: Draft | null) => {
  const batch = draft?.barcode?.batch;

  useEffect(() => {
    setTimeout(() => {
      if (!batch) return;
      const input = document.getElementById(getPackQuantityCellId(batch));
      if (input) {
        input.focus();
      }
    }, 500);
  }, [batch]);
};

export const OutboundLineEdit: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  draft,
  mode,
}) => {
  const item = !draft ? null : draft.item ?? null;
  const t = useTranslation(['distribution']);
  const { info } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);

  const { mutateAsync } = useOutbound.line.save();
  const { mutateAsync: insertBarcode } = useOutbound.utils.barcodeInsert();
  const { status } = useOutbound.document.fields('status');
  const isDisabled = useOutbound.utils.isDisabled();
  const {
    draftStockOutLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
  } = useDraftOutboundLines(currentItem);
  const packSizeController = usePackSizeController(draftStockOutLines);
  const { next, disabled: nextDisabled } = useNextItem(currentItem?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const height = useKeyboardHeightAdjustment(700);
  const { warning } = useNotification();
  useFocusNumberOfPacksInput(draft);

  const placeholder = draftStockOutLines?.find(
    ({ type, numberOfPacks }) =>
      type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
  );

  const onUpdateQuantity = (batchId: string, quantity: number) => {
    updateQuantity(batchId, quantity);
    setIsAutoAllocated(false);
  };

  const onSave = async () => {
    if (!isDirty) return;

    await mutateAsync(draftStockOutLines);
    if (!draft) return;

    const { barcode } = draft;
    const barcodeExists = !!barcode?.id;

    if (!barcode || !currentItem || barcodeExists) return;

    // it is possible for the user to select multiple batch lines
    // if the scanned barcode does not contain a batch number
    // however the scanned barcode can only relate to a specific pack size and therefore batch
    const packSize = draftStockOutLines.find(line => line.numberOfPacks > 0)
      ?.packSize;

    const input = {
      input: {
        gtin: barcode.gtin,
        itemId: currentItem?.id,
        packSize,
      },
    };

    try {
      await insertBarcode(input);
    } catch (error) {
      warning(t('error.unable-to-save-barcode', { error }))();
    }
  };

  const onNext = async () => {
    await onSave();
    if (!!placeholder) {
      const infoSnack = info(t('message.placeholder-line'));
      infoSnack();
    }
    if (mode === ModalMode.Update && next) setCurrentItem(next);
    else if (mode === ModalMode.Create) setCurrentItem(null);
    else onClose();
    setIsDirty(false);
    // Returning true here triggers the slide animation
    return true;
  };

  const onAllocate = (
    newVal: number,
    packSize: number | null,
    autoAllocated = false
  ) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftStockOutLines
    )(newVal, packSize);
    setIsDirty(true);
    setDraftStockOutLines(newAllocateQuantities ?? draftStockOutLines);
    setIsAutoAllocated(autoAllocated);

    return newAllocateQuantities;
  };

  const canAutoAllocate = !!(currentItem && draftStockOutLines.length);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;

  const handleClick = async () => {
    const allocated = draftStockOutLines?.reduce(
      (accumulator, stockOutLine) => accumulator + stockOutLine.numberOfPacks,
      0
    );
    if (allocated === 0) {
      const warningSnack = warning(t('warning.no-quantity-allocated'));
      warningSnack();
      return;
    } else {
      try {
        onSave();
        setIsDirty(false);
        if (!!placeholder) {
          const infoSnack = info(t('message.placeholder-line'));
          infoSnack();
        }
        onClose();
      } catch (e) {
        // console.log(e);
      }
    }
  };

  return (
    <Modal
      title={t(
        mode === ModalMode.Update ? 'heading.edit-item' : 'heading.add-item'
      )}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={okNextDisabled}
          variant="next"
          onClick={onNext}
        />
      }
      okButton={
        <DialogButton
          disabled={!currentItem}
          variant="ok"
          onClick={handleClick}
        />
      }
      height={height}
      width={1000}
    >
      <Grid container gap={0.5}>
        <OutboundLineEditForm
          disabled={mode === ModalMode.Update || isDisabled}
          packSizeController={packSizeController}
          onChangeItem={setCurrentItem}
          item={currentItem}
          allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
          availableQuantity={sumAvailableQuantity(draftStockOutLines)}
          onChangeQuantity={onAllocate}
          canAutoAllocate={canAutoAllocate}
          isAutoAllocated={isAutoAllocated}
        />

        <TableWrapper
          canAutoAllocate={canAutoAllocate}
          currentItem={currentItem}
          isLoading={isLoading}
          packSizeController={packSizeController}
          updateQuantity={onUpdateQuantity}
          draftOutboundLines={draftStockOutLines}
          allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
          batch={draft?.barcode?.batch}
        />
      </Grid>
    </Modal>
  );
};

interface TableProps {
  canAutoAllocate: boolean;
  currentItem: DraftItem | null;
  isLoading: boolean;
  packSizeController: PackSizeController;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
  draftOutboundLines: DraftStockOutLine[];
  allocatedQuantity: number;
  batch?: string;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftOutboundLines,
  allocatedQuantity,
  batch,
}) => {
  const t = useTranslation('distribution');

  if (!currentItem) return null;

  if (isLoading)
    return (
      <Box
        display="flex"
        flex={1}
        height={400}
        justifyContent="center"
        alignItems="center"
      >
        <InlineSpinner />
      </Box>
    );

  if (!canAutoAllocate)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <OutboundLineEditTable
        packSizeController={packSizeController}
        onChange={updateQuantity}
        rows={draftOutboundLines}
        item={currentItem}
        batch={batch}
        allocatedQuantity={allocatedQuantity}
      />
    </TableProvider>
  );
};
