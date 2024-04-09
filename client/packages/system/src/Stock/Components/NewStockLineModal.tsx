import React, { FC, useState } from 'react';
import {
  useTranslation,
  Grid,
  DialogButton,
  useDialog,
  ObjUtils,
  ModalRow,
  ModalLabel,
  Divider,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { StockLineForm } from './StockLineForm';
import { StockItemSearchInput } from '../..';

interface NewStockLineModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  // const { mutate, isLoading } = useStock.line.update();

  const onUpdate = (patch: Partial<StockLineRowFragment>) => {
    const newStockLine = { ...stockLine, ...patch };
    if (ObjUtils.isEqual(stockLine, newStockLine)) return;
    setStockLine(newStockLine);
  };
  //
  // todo check not 0
  // todo mock api
  // const onSave = async () => mutate(stockLine);

  return {
    draft: stockLine,
    onUpdate,
    onSave: () => Promise.resolve(),
    isLoading: false,
  };
};

export const NewStockLineModal: FC<NewStockLineModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation('inventory');
  const { Modal } = useDialog({ isOpen, onClose });

  // TODO
  const stockLine: StockLineRowFragment = {
    __typename: 'StockLineNode',
    availableNumberOfPacks: 0,
    costPricePerPack: 0,
    id: '',
    itemId: '',
    onHold: false,
    packSize: 0,
    sellPricePerPack: 0,
    storeId: '',
    totalNumberOfPacks: 0,
    item: {
      __typename: 'ItemNode',
      code: '',
      name: '',
      unitName: undefined,
    },
  };

  const { draft, onUpdate, onSave } = useDraftStockLine(stockLine);

  return (
    <Modal
      width={700}
      height={575}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={ObjUtils.isEqual(draft, stockLine)}
          onClick={async () => {
            await onSave();
            onClose();
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Grid
        container
        paddingBottom={4}
        alignItems="center"
        flexDirection="column"
        gap={1}
      >
        <ModalRow>
          <ModalLabel
            label={t('label.item', { count: 1 })}
            justifyContent="flex-end"
          />
          <Grid item flex={1}>
            <StockItemSearchInput
              autoFocus
              openOnFocus
              currentItemId={draft.itemId}
              onChange={newItem =>
                newItem && onUpdate({ itemId: newItem.id, item: newItem })
              }
            />
          </Grid>
        </ModalRow>
        <Divider />

        {draft.itemId && (
          <StockLineForm draft={draft} onUpdate={onUpdate} packQtyEditable />
        )}
        {/* TODO: reason */}
      </Grid>
    </Modal>
  );
};
