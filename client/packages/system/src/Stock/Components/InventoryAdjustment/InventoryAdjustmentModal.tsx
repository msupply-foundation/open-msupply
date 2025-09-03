import React from 'react';
import {
  useTranslation,
  Box,
  NumericTextInput,
  DialogButton,
  useNotification,
  AdjustmentTypeInput,
  useDialog,
  getReasonOptionTypes,
  useAuthContext,
  StoreModeNodeType,
  FormLabel,
  Typography,
  useTheme,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useInventoryAdjustment } from '../../api';
import { ReasonOptionsSearchInput } from '../../..';
import { InventoryAdjustmentDirectionInput } from './InventoryAdjustmentDirectionSearchInput';

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
  const { store } = useAuthContext();
  const { Modal } = useDialog({ isOpen, onClose });

  const { draft, setDraft, create } = useInventoryAdjustment(stockLine);

  const packUnit = String(stockLine.packSize);
  const saveDisabled = draft.adjustment === 0 || stockLine.onHold;
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
      title={t('title.stock-adjustment')}
      okButton={
        <DialogButton variant="ok" disabled={saveDisabled} onClick={save} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <>
        <ItemDetailHeader item={stockLine.item} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1em',
            width: '30em',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <FormLabel sx={{ fontWeight: 'bold' }} htmlFor="by">
              {t('label.adjust-by')}
            </FormLabel>
            <Box
              sx={{
                display: 'flex',
                width: '20em',
                justifyContent: 'space-between',
              }}
            >
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
              <NumericTextInput
                id="by"
                width="unset"
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
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <FormLabel sx={{ fontWeight: 'bold' }} htmlFor="reason">
              {t('label.reason')}
            </FormLabel>
            <ReasonOptionsSearchInput
              id="reason"
              disabled={draft.adjustment === 0}
              onChange={reason => setDraft(state => ({ ...state, reason }))}
              value={draft.reason}
              type={getReasonOptionTypes({
                isInventoryReduction,
                isVaccine: stockLine.item.isVaccine,
                isDispensary: store?.storeMode === StoreModeNodeType.Dispensary,
              })}
              width="20em"
            />
          </Box>
        </Box>
      </>
    </Modal>
  );
};

const ItemDetailHeader = ({
  item: { name, code, unitName },
}: {
  item: Pick<StockLineRowFragment['item'], 'name' | 'unitName' | 'code'>;
}) => {
  const t = useTranslation();
  const theme = useTheme();
  return (
    <Box
      sx={{
        borderWidth: 4,
        borderRadius: '16px',
        borderStyle: 'solid',
        borderColor: theme.palette.border,
        padding: 2,
        marginBottom: 2,
      }}
    >
      {/* Or maybe simpler: */}
      {/* <Typography>{code}</Typography> */}

      <Typography color={theme.typography.body2.color}>
        {t('label.code')}: {code}
        {unitName && (
          <Typography component="span" color={theme.typography.body2.color}>
            {' '}
            | {t('label.unit')}: {unitName}
          </Typography>
        )}
      </Typography>
      <Typography sx={{ fontWeight: 500, fontSize: '22px' }}>{name}</Typography>
    </Box>
  );
};
