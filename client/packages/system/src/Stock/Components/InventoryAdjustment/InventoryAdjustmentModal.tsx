import React from 'react';
import {
  TextWithLabelRow,
  useTranslation,
  Box,
  NumericTextInput,
  DialogButton,
  useNotification,
  AdjustmentTypeInput,
  useDialog,
  useFormatNumber,
  getReasonOptionType,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useInventoryAdjustment } from '../../api';
import { ReasonOptionsSearchInput, useReasonOptions } from '../../..';
import { InventoryAdjustmentDirectionInput } from './InventoryAdjustmentDirectionSearchInput';
import { INPUT_WIDTH, StyledInputRow } from '../StyledInputRow';

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
  const { round } = useFormatNumber();

  const { draft, setDraft, create } = useInventoryAdjustment(stockLine);
  const { data, isLoading } = useReasonOptions();

  const packUnit = String(stockLine.packSize);
  const saveDisabled = draft.adjustment === 0;
  const isInventoryReduction =
    draft.adjustmentType === AdjustmentTypeInput.Reduction;

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

  return (
    <Modal
      sx={{ maxWidth: 'unset', minWidth: 700 }}
      height={575}
      slideAnimation={false}
      title={t('title.adjustment-details')}
      okButton={
        <DialogButton variant="ok" disabled={saveDisabled} onClick={save} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Box display="flex" paddingRight={4} gap={2}>
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
                <ReasonOptionsSearchInput
                  disabled={draft.adjustment === 0}
                  onChange={reason => setDraft(state => ({ ...state, reason }))}
                  value={draft.reason}
                  type={getReasonOptionType(
                    isInventoryReduction,
                    stockLine.item.isVaccine
                  )}
                  width={INPUT_WIDTH}
                  reasonOptions={data?.nodes ?? []}
                  loading={isLoading}
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
            label={t('label.pack-quantity')}
            text={round(stockLine.totalNumberOfPacks, 2)}
            textProps={{ textAlign: 'end' }}
            labelProps={{ sx: { textWrap: 'wrap' } }}
          />
          <TextWithLabelRow
            label={t('label.available-packs')}
            text={round(stockLine.availableNumberOfPacks, 2)}
            textProps={{ textAlign: 'end' }}
            labelProps={{ sx: { textWrap: 'wrap' } }}
          />
          <StyledInputRow
            label={t('label.adjust-by')}
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                decimalLimit={2}
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
                value={parseFloat(
                  (
                    stockLine.totalNumberOfPacks +
                    (draft.adjustmentType === AdjustmentTypeInput.Addition
                      ? draft.adjustment
                      : -draft.adjustment)
                  ).toFixed(2)
                )}
              />
            }
          />
        </Box>
      </Box>
    </Modal>
  );
};
