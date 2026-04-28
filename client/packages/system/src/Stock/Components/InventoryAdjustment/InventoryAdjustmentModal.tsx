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
import { useHistoricalStockLines } from '../../../Item/api/hooks/useHistoricalStockLines/useHistoricalStockLines';
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

  // Fetch historical stock when a backdated date is selected
  const { data: historicalStockLines, isLoading: isLoadingHistorical } =
    useHistoricalStockLines({
    itemId: stockLine.itemId,
    datetime: draft.backdatedDatetime ?? undefined,
    enabled: !!draft.backdatedDatetime,
  });

  const historicalStockLine = historicalStockLines?.nodes?.find(
    node => node.id === stockLine.id
  );

  const historicalAvailable = historicalStockLine?.availableNumberOfPacks;
  const historicalTotal = historicalStockLine?.totalNumberOfPacks;

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

  const effectiveAvailable = draft.backdatedDatetime
    ? (historicalAvailable ?? stockLine.availableNumberOfPacks)
    : stockLine.availableNumberOfPacks;

  const belowZero = effectiveAvailable + variation < 0;

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
        <ItemDetailAndStats
          stockLine={stockLine}
          variation={variation}
          historicalAvailableNumberOfPacks={
            draft.backdatedDatetime ? historicalAvailable : undefined
          }
          historicalTotalNumberOfPacks={
            draft.backdatedDatetime ? historicalTotal : undefined
          }
          isLoading={isLoadingHistorical}
        />

        <AdjustmentForm
          isVaccine={stockLine.item.isVaccine}
          draft={draft}
          setDraft={setDraft}
        />

        {belowZero && (
          <Alert severity="error" sx={{ margin: '0 auto' }}>
            {t('error.reduced-below-zero')}
          </Alert>
        )}
      </>
    </Modal>
  );
};
