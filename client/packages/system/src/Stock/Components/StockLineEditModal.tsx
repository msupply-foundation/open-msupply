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
import { StockLineRowFragment, useStock } from '../api';
import { ActivityLogList } from '../../ActivityLog';
import { StockLineForm } from './StockLineForm';
import { InventoryAdjustmentForm } from './InventoryAdjustment';
import { LedgerForm } from './Ledger';

interface StockLineEditModalProps {
  isOpen: boolean;
  onClose: () => void;

  stockLine: StockLineRowFragment;
}

interface UseDraftStockLineControl {
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftStockLine = (
  seed: StockLineRowFragment
): UseDraftStockLineControl => {
  const [stockLine, setStockLine] = useState<StockLineRowFragment>({ ...seed });
  const { mutate, isLoading } = useStock.line.update();

  useEffect(() => {
    setStockLine(seed);
  }, [seed]);

  const onUpdate = (patch: Partial<StockLineRowFragment>) => {
    const newStockLine = { ...stockLine, ...patch };
    if (ObjUtils.isEqual(stockLine, newStockLine)) return;
    setStockLine(newStockLine);
  };

  const onSave = async () => mutate(stockLine);

  return {
    draft: stockLine,
    onUpdate,
    onSave,
    isLoading,
  };
};

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

  const { draft, onUpdate, onSave } = useDraftStockLine(stockLine);
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
        <StockLineForm draft={draft} onUpdate={onUpdate} plugins={plugins} />
      ),
      value: 'label.details',
    },
    {
      Component: (
        <InventoryAdjustmentForm stockLine={draft} onUpdate={onUpdate} />
      ),
      value: 'label.adjust',
    },
    {
      Component: <ActivityLogList recordId={draft?.id ?? ''} />,
      value: 'label.log',
    },
    ...(Environment.FEATURE_INVENTORY_ADJUSTMENTS
      ? [
          {
            Component: <LedgerForm stockLine={draft} />,
            value: 'label.ledger',
          },
        ]
      : []),
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
                await onSave();
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
