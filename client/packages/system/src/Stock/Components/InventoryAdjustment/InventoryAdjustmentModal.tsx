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
  Alert,
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

  const isInventoryReduction =
    draft.adjustmentType === AdjustmentTypeInput.Reduction;

  const variation = isInventoryReduction ? -draft.adjustment : draft.adjustment;
  const belowZero = stockLine.availableNumberOfPacks + variation < 0;

  const saveDisabled = draft.adjustment === 0 || belowZero;

  return (
    <Modal
      height={575}
      width={700}
      contentProps={{ sx: { padding: 0, width: 650, margin: '0 auto' } }}
      slideAnimation={false}
      title={t('title.stock-adjustment')}
      okButton={
        <DialogButton variant="ok" disabled={saveDisabled} onClick={save} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <>
        <ItemDetailAndStats stockLine={stockLine} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'end',
            backgroundColor: 'background.secondary',
            padding: '1em',
            borderRadius: '16px',
            gap: '1em',
          }}
        >
          <Stat
            label={t('label.new-available-packs')}
            value={stockLine.availableNumberOfPacks + variation}
            color={'secondary.main'}
          />
          <Box
            sx={{
              width: '1px',
              backgroundColor: 'secondary.main',
              height: '-webkit-fill-available',
            }}
          ></Box>
          <Stat
            label={t('label.new-total-packs')}
            value={stockLine.totalNumberOfPacks + variation}
            color={'secondary.main'}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1em',
            width: '30em',
            margin: '1.5em auto',
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
        {stockLine.availableNumberOfPacks + variation < 0 && (
          <Alert severity="error">{t('error.reduced-below-zero')}</Alert>
        )}
      </>
    </Modal>
  );
};

const ItemDetailAndStats = ({
  stockLine,
}: {
  stockLine: StockLineRowFragment;
}) => {
  const t = useTranslation();

  const {
    item: { code, name, unitName },
    packSize,
    totalNumberOfPacks,
    availableNumberOfPacks,
  } = stockLine;
  return (
    <Box
      sx={{
        borderWidth: 4,
        borderRadius: '16px',
        borderStyle: 'solid',
        borderColor: 'border',
        paddingX: 2,
        paddingY: 1,
        marginBottom: 2,
      }}
    >
      {/* Or maybe simpler: */}
      {/* <Typography>{code}</Typography> */}

      <Typography color="gray.dark">
        {t('label.code')}: {code}
        {unitName && (
          <Typography component="span" color="gray.dark">
            {' '}
            | {t('label.unit')}: {unitName}
          </Typography>
        )}
      </Typography>
      <Typography sx={{ fontWeight: 500, fontSize: '22px' }}>{name}</Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-evenly',
          gap: 4,
          marginTop: 2,
          alignItems: 'end', // ensure numbers align even if 1 label wraps
        }}
      >
        <Stat label={t('label.pack-size')} value={packSize} />
        <Stat
          label={t('label.available-packs')}
          value={availableNumberOfPacks}
        />
        <Stat
          label={t('label.total-packs-on-hand')}
          value={totalNumberOfPacks}
        />
      </Box>
    </Box>
  );
};

const Stat = ({
  label,
  value,
  color = 'text.primary',
}: {
  label: string;
  value: number;
  color?: string;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '10rem',
      }}
    >
      <Typography color="gray.dark">{label}</Typography>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '1.5rem',
          color: value < 0 ? 'error.main' : color,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};
