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
  Box,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { StockLineForm } from './StockLineForm';
import {
  Adjustment,
  InventoryAdjustmentReasonRowFragment,
  InventoryAdjustmentReasonSearchInput,
  StockItemSearchInput,
} from '../..';
import { StyledInputRow } from './StyledInputRow';

const INPUT_WIDTH = 160;

interface NewStockLineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DummyInput = StockLineRowFragment & {
  // tODO : only need id, manage this diff??
  // should be like item selector, manages own state, only needs id :)
  inventoryAdjustmentReason: InventoryAdjustmentReasonRowFragment | null;
};

interface UseDraftStockLineControl {
  draft: DummyInput;
  onUpdate: (patch: Partial<DummyInput>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

// TODO: manage state in API hook
const useDraftStockLine = (): UseDraftStockLineControl => {
  const [stockLine, setStockLine] = useState<DummyInput>({
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
      unitName: undefined,
      // ... not needed..
      __typename: 'ItemNode',
      code: '',
      name: '',
    },
    inventoryAdjustmentReason: null,
  });
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

  const { draft, onUpdate, onSave } = useDraftStockLine();

  return (
    <Modal
      width={700}
      height={575}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={false} // todo
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
              autoFocus={!draft.itemId}
              openOnFocus={!draft.itemId}
              disabled={!!draft.itemId}
              currentItemId={draft.itemId}
              onChange={newItem =>
                newItem && onUpdate({ itemId: newItem.id, item: newItem })
              }
            />
          </Grid>
        </ModalRow>
        <Divider />

        {draft.itemId && (
          <>
            <StockLineForm draft={draft} onUpdate={onUpdate} packEditable />

            <Grid container justifyContent="start" display="flex">
              <Grid item width="50%">
                <StyledInputRow
                  label={t('label.reason')}
                  Input={
                    <Box display="flex" width={INPUT_WIDTH}>
                      <InventoryAdjustmentReasonSearchInput
                        width={INPUT_WIDTH}
                        adjustment={Adjustment.Addition}
                        value={draft.inventoryAdjustmentReason}
                        onChange={reason =>
                          onUpdate({ inventoryAdjustmentReason: reason })
                        }
                      />
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </>
        )}
      </Grid>
    </Modal>
  );
};
