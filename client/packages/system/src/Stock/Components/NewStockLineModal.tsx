import React, { FC } from 'react';
import {
  useTranslation,
  Grid,
  DialogButton,
  useDialog,
  ModalRow,
  ModalLabel,
  Divider,
  Box,
} from '@openmsupply-client/common';
import { DraftStockLine, useStockLine } from '../api';
import { StockLineForm } from './StockLineForm';
import {
  Adjustment,
  InventoryAdjustmentReasonSearchInput,
  StockItemSearchInput,
} from '../..';
import { INPUT_WIDTH, StyledInputRow } from './StyledInputRow';

interface NewStockLineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStockLineModal: FC<NewStockLineModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation('inventory');
  const { Modal } = useDialog({ isOpen, onClose });

  const { draft, setDraft, create } = useStockLine();

  const onUpdate = (patch: Partial<DraftStockLine>) => {
    setDraft({ ...draft, ...patch });
  };

  const isDisabled =
    !draft.itemId || !draft.packSize || !draft.totalNumberOfPacks;

  return (
    <Modal
      width={700}
      height={575}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={isDisabled}
          onClick={async () => {
            try {
              await create();
              onClose();
            } catch {
              // todo
            }
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
          <Grid item width={'100%'}>
            <StockLineForm draft={draft} onUpdate={onUpdate} packEditable />

            <Grid item width={'50%'}>
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
        )}
      </Grid>
    </Modal>
  );
};
