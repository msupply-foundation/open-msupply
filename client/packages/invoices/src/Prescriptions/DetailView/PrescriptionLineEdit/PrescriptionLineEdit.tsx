import React, { useState } from 'react';
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
  useFormatNumber,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { useDraftPrescriptionLines, useNextItem } from './hooks';
import { usePrescription } from '../../api';
import { Draft, DraftItem } from '../../..';
import {
  PackSizeController,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
  allocateQuantities,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';

interface PrescriptionLineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft | null;
  mode: ModalMode | null;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditModalProps> = ({
  isOpen,
  onClose,
  draft,
  mode,
}) => {
  const item = !draft ? null : draft.item ?? null;
  const t = useTranslation(['dispensary']);
  const { info, warning } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);

  const { mutateAsync } = usePrescription.line.save();
  const { mutateAsync: mutateStatus } = usePrescription.document.update();
  const { status, id: invoiceId } = usePrescription.document.fields([
    'status',
    'id',
  ]);
  const isDisabled = usePrescription.utils.isDisabled();
  const {
    draftStockOutLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
    updateNotes,
  } = useDraftPrescriptionLines(currentItem);
  const packSizeController = usePackSizeController(draftStockOutLines);
  const { next, disabled: nextDisabled } = useNextItem(currentItem?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const height = useKeyboardHeightAdjustment(700);
  const { format } = useFormatNumber();

  const placeholder = draftStockOutLines?.find(
    ({ type, numberOfPacks }) =>
      type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
  );

  const onUpdateQuantity = (batchId: string, quantity: number) => {
    updateQuantity(batchId, quantity);
    setIsAutoAllocated(false);
  };

  const onUpdateNotes = (note: string) => {
    updateNotes(note);
    setIsAutoAllocated(false);
  };

  const onSave = async () => {
    if (!isDirty) return;

    // needed since placeholders aren't being created for prescriptions yet, but still adding to array
    const hasOnHold = draftStockOutLines.some(
      ({ stockLine, location }) => stockLine?.onHold || location?.onHold
    );

    if (
      status !== InvoiceNodeStatus.Picked &&
      draftStockOutLines.length >= 1 &&
      !hasOnHold
    ) {
      await mutateStatus({
        id: invoiceId,
        status: InvoiceNodeStatus.Picked,
      });
    }
    await mutateAsync(draftStockOutLines);

    if (!draft) return;
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

    const allocateInUnits = packSize === null;
    const newAllocatedTotal = newAllocateQuantities?.reduce(
      (acc, { numberOfPacks, packSize }) =>
        acc + numberOfPacks * (allocateInUnits ? packSize : 1),
      0
    );
    const difference = newVal - (newAllocatedTotal ?? 0);
    if (difference > 0 && newAllocatedTotal !== undefined) {
      const warningSnack = warning(
        t(
          allocateInUnits
            ? 'warning.cannot-create-placeholder-units'
            : 'warning.cannot-create-placeholder-packs',
          {
            quantity: format(newAllocatedTotal),
          }
        )
      );
      warningSnack();
    }
  };

  const canAutoAllocate = !!(currentItem && draftStockOutLines.length);
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
        <PrescriptionLineEditForm
          disabled={mode === ModalMode.Update || isDisabled}
          packSizeController={packSizeController}
          onChangeItem={setCurrentItem}
          item={currentItem}
          allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
          availableQuantity={sumAvailableQuantity(draftStockOutLines)}
          onChangeQuantity={onAllocate}
          canAutoAllocate={canAutoAllocate}
          isAutoAllocated={isAutoAllocated}
          updateNotes={onUpdateNotes}
          draftPrescriptionLines={draftStockOutLines}
        />

        <TableWrapper
          canAutoAllocate={canAutoAllocate}
          currentItem={currentItem}
          isLoading={isLoading}
          packSizeController={packSizeController}
          updateQuantity={onUpdateQuantity}
          draftPrescriptionLines={draftStockOutLines}
          allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
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
  draftPrescriptionLines: DraftStockOutLine[];
  allocatedQuantity: number;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftPrescriptionLines,
  allocatedQuantity,
}) => {
  const t = useTranslation('dispensary');

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
      <PrescriptionLineEditTable
        packSizeController={packSizeController}
        onChange={updateQuantity}
        rows={draftPrescriptionLines}
        item={currentItem}
        allocatedQuantity={allocatedQuantity}
      />
    </TableProvider>
  );
};
