import React, { useEffect } from 'react';
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
import {
  useDraftOutboundLines,
  usePackSizeController,
  useNextItem,
  PackSizeController,
} from './hooks';
import {
  allocateQuantities,
  sumAvailableQuantity,
  getAllocatedQuantity,
  getAllocatedPacks,
} from './utils';
import { Draft, DraftItem, useOutbound } from '../../api';
import { DraftOutboundLine } from '../../../types';
import { getPackQuantityCellId } from '../../../utils';

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

  const { mutateAsync } = useOutbound.line.save();
  const { mutateAsync: insertBarcode } = useOutbound.utils.barcodeInsert();
  const { status } = useOutbound.document.fields('status');
  const isDisabled = useOutbound.utils.isDisabled();
  const {
    draftOutboundLines,
    updateQuantity,
    setDraftOutboundLines,
    isLoading,
  } = useDraftOutboundLines(currentItem);
  const packSizeController = usePackSizeController(draftOutboundLines);
  const { next, disabled: nextDisabled } = useNextItem(currentItem?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const height = useKeyboardHeightAdjustment(700);
  const { warning } = useNotification();
  useFocusNumberOfPacksInput(draft);

  const placeholder = draftOutboundLines?.find(
    ({ type, numberOfPacks }) =>
      type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
  );

  const onSave = async () => {
    if (!isDirty) return;

    await mutateAsync(draftOutboundLines);
    console.log('draft', draft);
    if (!draft) return;

    const { barcode } = draft;
    const barcodeExists = !!barcode?.id;
    console.info(
      `barcode: ${JSON.stringify(barcode)} currentItem: ${JSON.stringify(
        currentItem
      )} barcodeExists: ${barcodeExists})`
    );
    if (!barcode || !currentItem || barcodeExists) return;

    // it is possible for the user to select multiple batch lines
    // if the scanned barcode does not contain a batch number
    // however the scanned barcode can only relate to a specific pack size and therefore batch
    const packSize = draftOutboundLines.find(
      line => line.numberOfPacks > 0
    )?.packSize;

    const input = {
      input: {
        value: barcode.value,
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

  const onAllocate = (newVal: number, packSize: number | null) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftOutboundLines
    )(newVal, packSize);
    setIsDirty(true);
    setDraftOutboundLines(newAllocateQuantities ?? draftOutboundLines);
  };

  const canAutoAllocate = !!(currentItem && draftOutboundLines.length);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;

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
          onClick={async () => {
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
          }}
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
          allocatedQuantity={getAllocatedQuantity(draftOutboundLines)}
          availableQuantity={sumAvailableQuantity(draftOutboundLines)}
          onChangeQuantity={onAllocate}
          canAutoAllocate={canAutoAllocate}
        />

        <TableWrapper
          canAutoAllocate={canAutoAllocate}
          currentItem={currentItem}
          isLoading={isLoading}
          packSizeController={packSizeController}
          updateQuantity={updateQuantity}
          draftOutboundLines={draftOutboundLines}
          allocatedQuantity={getAllocatedQuantity(draftOutboundLines)}
          allocatedPacks={getAllocatedPacks(draftOutboundLines)}
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
  draftOutboundLines: DraftOutboundLine[];
  allocatedQuantity: number;
  allocatedPacks: number;
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
  allocatedPacks,
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
        allocatedPacks={allocatedPacks}
      />
    </TableProvider>
  );
};
