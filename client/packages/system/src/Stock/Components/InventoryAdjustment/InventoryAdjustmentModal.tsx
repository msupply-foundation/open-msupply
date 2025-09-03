import React from 'react';
import {
  useTranslation,
  DialogButton,
  useNotification,
  AdjustmentTypeInput,
  useDialog,
  Alert,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useInventoryAdjustment } from '../../api';
import { AdjustmentForm } from './AdjustmentForm';
import { ItemDetailAndStats } from './AdjustmentStats';

interface InventoryAdjustmentModalProps {
  stockLine: StockLineRowFragment;
  isOpen: boolean;
  onClose: () => void;
}
export const InventoryAdjustmentModal = ({
  stockLine,
  isOpen,
  onClose,
}: InventoryAdjustmentModalProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });

  const { draft, setDraft, create } = useInventoryAdjustment(stockLine);

  const save = async () => {
    try {
      const result = await create();

      if (result === undefined) {
        const successSnack = success(t('messages.inventory-adjustment-saved'));
        successSnack();
        onClose();
        return;
      }

      const errorSnack = error(t(result));
      errorSnack();
    } catch {
      error(t('messages.could-not-save'))(); // generic could not save message
    }
  };

  const variation =
    draft.adjustmentType === AdjustmentTypeInput.Reduction
      ? -draft.adjustment
      : draft.adjustment;

  const belowZero = stockLine.availableNumberOfPacks + variation < 0;

  const saveDisabled = draft.adjustment === 0 || belowZero;

  return (
    <Modal
      height={600}
      width={660}
      contentProps={{ sx: { paddingTop: 0 } }}
      slideAnimation={false}
      title={t('title.stock-adjustment')}
      okButton={
        <DialogButton variant="ok" disabled={saveDisabled} onClick={save} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <>
        <ItemDetailAndStats stockLine={stockLine} variation={variation} />

        <AdjustmentForm
          isVaccine={stockLine.item.isVaccine}
          draft={draft}
          setDraft={setDraft}
        />

        {stockLine.availableNumberOfPacks + variation < 0 && (
          <Alert severity="error" sx={{ marginRight: 0 }}>
            {t('error.reduced-below-zero')}
          </Alert>
        )}
      </>
    </Modal>
  );
};
