import React, { useState } from 'react';
import {
  DialogButton,
  Grid,
  useDialog,
  useTranslation,
  ModalMode,
  useNotification,
  InvoiceNodeStatus,
  BasicSpinner,
} from '@openmsupply-client/common';
import { useNextItem } from './hooks';
import { useOutboundLineEditData } from '../../api';
import { ScannedBarcode } from '../../../types';
import { SelectItem } from './SelectItem';
import { Allocation } from './Allocation';
import { useOpenedWithBarcode } from './hooks/useOpenedWithBarcode';
import { useAllocationContext } from './allocation/useAllocationContext';
import { useSaveOutboundLines } from '../../api/hooks/useSaveOutboundLines';
import { getAllocatedUnits } from './allocation/utils';

export type OutboundOpenedWith = { itemId: string } | ScannedBarcode | null;

interface OutboundLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  openedWith: OutboundOpenedWith;
  mode: ModalMode | null;
  status: InvoiceNodeStatus;
  invoiceId: string;
}

export const OutboundLineEdit = ({
  isOpen,
  onClose: closeModal,
  openedWith,
  mode,
  status,
  invoiceId,
}: OutboundLineEditProps) => {
  const t = useTranslation();
  const { info, warning } = useNotification();
  const [itemId, setItemId] = useState(openedWith?.itemId);

  const onClose = () => {
    clear();
    closeModal();
  };
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { next, disabled: nextDisabled } = useNextItem(itemId);

  const { data: itemData, isFetching } = useOutboundLineEditData(
    invoiceId,
    itemId
  );
  const { mutateAsync } = useSaveOutboundLines(invoiceId);
  const { saveBarcode } = useOpenedWithBarcode(asBarcodeOrNull(openedWith));

  const {
    draftLines,
    allocatedUnits,
    placeholderQuantity,
    alerts,
    isDirty,
    setAlerts,
    clear,
  } = useAllocationContext(state => ({
    draftLines: state.draftLines,
    placeholderQuantity: state.placeholderQuantity,
    allocatedUnits: getAllocatedUnits(state),
    alerts: state.alerts,
    isDirty: state.isDirty,
    setAlerts: state.setAlerts,
    clear: state.clear,
  }));

  const onSave = async () => {
    if (!isDirty) return;
    if (!itemId) return;

    await mutateAsync({
      lines: draftLines,
      itemId,
      placeholderQuantity,
    });

    try {
      await saveBarcode(itemId);
    } catch (error) {
      warning(t('error.unable-to-save-barcode', { error }))();
    }
  };

  const okNextDisabled = (mode === ModalMode.Update && nextDisabled) || !itemId;

  const handleSave = async (onSaved: () => boolean | void) => {
    const confirmZeroQuantityMessage = t('messages.confirm-zero-quantity');
    if (
      allocatedUnits === 0 &&
      !alerts.some(alert => alert.message === confirmZeroQuantityMessage)
    ) {
      setAlerts([{ message: confirmZeroQuantityMessage, severity: 'warning' }]);
      return;
    }

    try {
      await onSave();
      if (!!placeholderQuantity) {
        const infoSnack = info(t('message.placeholder-line'));
        infoSnack();
      }

      return onSaved();
    } catch (e) {
      // Errors handled by main GraphQL handler
    }
  };

  const onNext = async () => {
    const onSaved = () => {
      if (mode === ModalMode.Update && next) {
        setItemId(next.id);
        return true;
      }
      if (mode === ModalMode.Create) {
        setItemId(undefined);
        return true;
      }
      onClose();
    };

    // Returning true here triggers the slide animation
    return await handleSave(onSaved);
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
          variant="next-and-ok"
          onClick={onNext}
        />
      }
      okButton={
        <DialogButton
          disabled={!itemId || !isDirty}
          variant="ok"
          onClick={() => handleSave(onClose)}
        />
      }
      height={700}
      width={1200}
    >
      <Grid container gap={0.5}>
        <SelectItem
          itemId={itemId}
          onChangeItem={setItemId}
          disabled={mode === ModalMode.Update}
        />
        {isFetching ? (
          <BasicSpinner />
        ) : (
          itemData && (
            <Allocation
              key={itemId}
              itemData={itemData}
              allowPlaceholder={status === InvoiceNodeStatus.New}
              scannedBatch={asBarcodeOrNull(openedWith)?.batch}
            />
          )
        )}
      </Grid>
    </Modal>
  );
};

const asBarcodeOrNull = (
  openedWith: OutboundOpenedWith
): ScannedBarcode | null => {
  if (openedWith && 'gtin' in openedWith) {
    return openedWith;
  }
  return null;
};
