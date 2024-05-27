import React, { FC } from 'react';
import {
  TextWithLabelRow,
  useTranslation,
  Box,
  NumericTextInput,
  DialogButton,
  useNotification,
  AdjustmentTypeInput,
  useDialog,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useInventoryAdjustment } from '../../api';
import { InventoryAdjustmentReasonSearchInput, usePackVariant } from '../../..';
import { InventoryAdjustmentDirectionInput } from './InventoryAdjustmentDirectionSearchInput';
import { INPUT_WIDTH, StyledInputRow } from '../StyledInputRow';

interface InventoryAdjustmentModalProps {
  stockLine: StockLineRowFragment;
  isOpen: boolean;
  onClose: () => void;
}
export const InventoryAdjustmentModal: FC<InventoryAdjustmentModalProps> = ({
  stockLine,
  isOpen,
  onClose,
}) => {
  const t = useTranslation('inventory');
  const { success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });

  const { draft, setDraft, create } = useInventoryAdjustment(stockLine);

  const { asPackVariant } = usePackVariant(
    stockLine.itemId,
    stockLine.item.unitName ?? null
  );
  const packUnit = asPackVariant(stockLine.packSize);

  const saveDisabled = draft.adjustment === 0;

  const save = async () => {
    try {
      await create();
      const successSnack = success(t('messages.inventory-adjustment-saved'));
      successSnack();
      onClose();
    } catch {
      // TODO: handle error if no reason selected when reasons required
    }
  };

  return (
    <Modal
      sx={{ maxWidth: 'unset', minWidth: 700, minHeight: 575 }}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton variant="ok" disabled={saveDisabled} onClick={save} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Box display="flex">
        <Box display="flex" flexDirection="column" padding={2} gap={2} flex={1}>
          <TextWithLabelRow
            label={t('label.pack')}
            text={packUnit}
            textProps={{ textAlign: 'end' }}
          />
          <Box display="flex" justifyContent={'end'}>
            <InventoryAdjustmentDirectionInput
              value={draft.adjustmentType}
              onChange={adjustmentType => {
                setDraft({
                  adjustmentType:
                    adjustmentType ?? AdjustmentTypeInput.Addition,
                  reason: null,
                  adjustment: 0,
                });
              }}
            />
          </Box>
          <StyledInputRow
            label={t('label.reason')}
            Input={
              <Box display="flex" width={INPUT_WIDTH}>
                <InventoryAdjustmentReasonSearchInput
                  onChange={reason => setDraft(state => ({ ...state, reason }))}
                  value={draft.reason}
                  adjustmentType={draft.adjustmentType}
                  width={INPUT_WIDTH}
                />
              </Box>
            }
          />
        </Box>
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
          paddingTop={2}
          flex={1}
        >
          <TextWithLabelRow
            label={t('label.num-packs')}
            text={String(stockLine.totalNumberOfPacks)}
            textProps={{ textAlign: 'end' }}
            labelProps={{ sx: { textWrap: 'wrap' } }}
          />
          <StyledInputRow
            label={t('label.adjust-by')}
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                max={
                  draft.adjustmentType === AdjustmentTypeInput.Reduction
                    ? stockLine.totalNumberOfPacks
                    : undefined
                }
                value={draft.adjustment}
                onChange={value =>
                  setDraft(state => ({
                    ...state,
                    adjustment: value ?? 0,
                  }))
                }
              />
            }
          />
          <StyledInputRow
            label={t('label.new-pack-qty')}
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                disabled={true}
                value={
                  stockLine.totalNumberOfPacks +
                  (draft.adjustmentType === AdjustmentTypeInput.Addition
                    ? draft.adjustment
                    : -draft.adjustment)
                }
              />
            }
          />
        </Box>
      </Box>
    </Modal>
  );
};
