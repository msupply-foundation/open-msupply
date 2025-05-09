import React, { useState } from 'react';
import {
  DialogButton,
  Grid,
  useDialog,
  useTranslation,
  ModalMode,
  useNotification,
  InvoiceNodeStatus,
  InvoiceLineNodeType,
} from '@openmsupply-client/common';
import { useNextItem } from './hooks';
import { useOutbound } from '../../api';
import { DraftStockOutLine, ScannedBarcode } from '../../../types';
import { SelectItem } from './SelectItem';
import { Allocation } from './Allocation';
import { useOpenedWithBarcode } from './hooks/useOpenedWithBarcode';

export type OutboundOpenedWith = { itemId: string } | ScannedBarcode | null;

interface OutboundLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  openedWith: OutboundOpenedWith;
  mode: ModalMode | null;
  status: InvoiceNodeStatus;
}

export const OutboundLineEdit = ({
  isOpen,
  onClose,
  openedWith,
  mode,
  status,
}: OutboundLineEditProps) => {
  const t = useTranslation();
  const { info, warning } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const [itemId, setItemId] = useState(openedWith?.itemId);
  const [isDirty, setIsDirty] = useState(false);

  const { next, disabled: nextDisabled } = useNextItem(itemId);

  const { mutateAsync } = useOutbound.line.save(status);
  const { saveBarcode } = useOpenedWithBarcode(asBarcodeOrNull(openedWith));

  // tODO
  const draftStockOutLines: DraftStockOutLine[] = [];

  const onSave = async () => {
    if (!isDirty) return;

    await mutateAsync(draftStockOutLines);
    if (!itemId) return;

    // TODO- move out?
    // it is possible for the user to select multiple batch lines
    // if the scanned barcode does not contain a batch number
    // however the scanned barcode can only relate to a specific pack size and therefore batch
    const packSize = draftStockOutLines.find(
      line => line.numberOfPacks > 0
    )?.packSize;

    try {
      await saveBarcode(itemId, packSize);
    } catch (error) {
      warning(t('error.unable-to-save-barcode', { error }))();
    }
  };

  const okNextDisabled = (mode === ModalMode.Update && nextDisabled) || !itemId;

  const handleSave = async (onSaved: () => boolean | void) => {
    // if (
    //   getAllocatedQuantity(draftStockOutLines) === 0 &&
    //   !showZeroQuantityConfirmation
    // ) {
    //   setShowZeroQuantityConfirmation(true);
    //   return;
    // }

    try {
      await onSave();
      setIsDirty(false);
      const placeholder = draftStockOutLines?.find(
        ({ type, numberOfPacks }) =>
          type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
      );
      if (!!placeholder) {
        const infoSnack = info(t('message.placeholder-line'));
        infoSnack();
      }
      // setShowZeroQuantityConfirmation(false);

      return onSaved();
    } catch (e) {
      // console.error(e);
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
          disabled={!itemId} // todo - disable while handling issue quan change?
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
          disabled={mode === ModalMode.Update} // TODO - barcode w no item?
        />
        <Allocation itemId={itemId} />
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
