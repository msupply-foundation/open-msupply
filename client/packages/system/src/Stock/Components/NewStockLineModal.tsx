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
  useNotification,
  AdjustmentTypeInput,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useStockLine } from '../api';
import { StockLineForm } from './StockLineForm';
import {
  InventoryAdjustmentReasonSearchInput,
  StockItemSearchInput,
} from '../..';
import { INPUT_WIDTH, StyledInputRow } from './StyledInputRow';
import { AppRoute } from '@openmsupply-client/config';

interface NewStockLineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStockLineModal: FC<NewStockLineModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslation('inventory');
  const navigate = useNavigate();
  const { success } = useNotification();

  const { Modal } = useDialog({ isOpen, onClose });

  const {
    query: { isLoading },
    draft,
    updatePatch,
    create: { create },
  } = useStockLine();

  const isDisabled =
    !draft.itemId || !draft.packSize || !draft.totalNumberOfPacks;

  const save = async () => {
    try {
      const result = await create();
      const successSnack = success(t('messages.stock-line-saved'));
      successSnack();
      onClose();
      navigate(
        RouteBuilder.create(AppRoute.Inventory)
          .addPart(AppRoute.Stock)
          .addPart(result.insertStockLine.id)
          .build()
      );
    } catch {
      // todo
    }
  };

  return (
    <Modal
      width={700}
      height={575}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton variant="ok" disabled={isDisabled} onClick={save} />
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
                newItem && updatePatch({ itemId: newItem.id, item: newItem })
              }
            />
          </Grid>
        </ModalRow>
        <Divider />

        {draft.itemId && (
          <Grid item width={'100%'}>
            <StockLineForm
              draft={draft}
              loading={isLoading}
              onUpdate={updatePatch}
              packEditable
              isInModal
            />

            <Grid item width={'50%'}>
              <StyledInputRow
                label={t('label.reason')}
                Input={
                  <Box display="flex" width={INPUT_WIDTH}>
                    <InventoryAdjustmentReasonSearchInput
                      width={INPUT_WIDTH}
                      adjustmentType={AdjustmentTypeInput.Addition}
                      value={draft.inventoryAdjustmentReason}
                      onChange={reason =>
                        updatePatch({ inventoryAdjustmentReason: reason })
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
