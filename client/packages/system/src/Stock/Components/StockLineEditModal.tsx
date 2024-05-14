import React, { FC, useEffect, useState } from 'react';
import {
  useTranslation,
  Grid,
  Typography,
  DialogButton,
  useDialog,
  ObjUtils,
  useConfirmationModal,
  ModalTabs,
  usePluginEvents,
  usePluginElements,
  PluginEventListener,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useStock, useStockLine } from '../api';
import { ActivityLogList } from '../../ActivityLog';
import { StockLineForm } from './StockLineForm';
import { InventoryAdjustmentForm } from './InventoryAdjustment';
import { LedgerForm } from './Ledger';

interface StockLineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockLine: StockLineRowFragment;
}

export const StockLineEditModal: FC<StockLineEditModalProps> = ({
  stockLine,
  isOpen,
  onClose,
}) => {
  const t = useTranslation('inventory');
  const { Modal } = useDialog({ isOpen, onClose });
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-save-stock-line'),
  });

  const {
    query: { isLoading },
    draft,
    updatePatch,
    update,
  } = useStockLine(stockLine.id);
  const { dispatchEvent, addEventListener, removeEventListener } =
    usePluginEvents();
  const [hasChanged, setHasChanged] = useState(false);
  const plugins = usePluginElements({
    type: 'StockEditForm',
    data: stockLine,
  });

  const tabs = [
    {
      Component: (
        <StockLineForm
          loading={isLoading}
          draft={draft}
          onUpdate={updatePatch}
          plugins={plugins}
        />
      ),
      value: 'label.details',
    },
    {
      Component: (
        <InventoryAdjustmentForm stockLine={draft} onUpdate={updatePatch} />
      ),
      value: 'label.adjust',
    },
    {
      Component: <ActivityLogList recordId={draft?.id ?? ''} />,
      value: 'label.log',
    },
    {
      Component: <LedgerForm stockLine={draft} />,
      value: 'label.ledger',
    },
  ];

  const onChange = () => setHasChanged(true);

  useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onChangeStockEditForm',
      listener: onChange,
    };

    addEventListener(listener);

    return () => removeEventListener(listener);
  }, [addEventListener, removeEventListener]);

  return (
    <Modal
      sx={{ maxWidth: 'unset', minWidth: 700, minHeight: 575 }}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={ObjUtils.isEqual(draft, stockLine) && !hasChanged}
          onClick={() =>
            getConfirmation({
              onConfirm: async () => {
                await update();
                dispatchEvent('onSaveStockEditForm', new Event(draft.id));
                onClose();
              },
            })
          }
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Grid container alignItems="center" flexDirection="column">
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">
          {stockLine.item.name}
        </Typography>
        <Typography sx={{ fontWeight: 'bold', marginBottom: 3 }}>
          {`${t('label.code')} : ${stockLine.item.code}`}
        </Typography>
        <ModalTabs tabs={tabs} />
      </Grid>
    </Modal>
  );
};
