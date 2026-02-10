import React, { Dispatch, SetStateAction } from 'react';
import {
  useTranslation,
  Box,
  NumericTextInput,
  AdjustmentTypeInput,
  getReasonOptionTypes,
  useAuthContext,
  StoreModeNodeType,
  FormLabel,
  ReasonOptionNodeType,
  Typography,
} from '@openmsupply-client/common';
import { DraftInventoryAdjustment } from '../../api';
import { ReasonOptionsSearchInput } from '../../..';
import { InventoryAdjustmentDirectionInput } from './InventoryAdjustmentDirectionInput';

export const AdjustmentForm = ({
  draft,
  setDraft,
  isVaccine,
}: {
  draft: DraftInventoryAdjustment;
  setDraft: Dispatch<SetStateAction<DraftInventoryAdjustment>>;
  isVaccine: boolean;
}) => {
  const t = useTranslation();
  const { store } = useAuthContext();

  const isInventoryReduction =
    draft.adjustmentType === AdjustmentTypeInput.Reduction;

  return (
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
          {t('label.adjust-packs')}
        </FormLabel>
        <Box
          sx={{
            display: 'flex',
            width: '20em',
            justifyContent: 'space-between',
            gap: '1em',
          }}
        >
          <InventoryAdjustmentDirectionInput
            value={draft.adjustmentType}
            onChange={adjustmentType => {
              setDraft(state => ({
                ...state,
                adjustmentType: adjustmentType ?? AdjustmentTypeInput.Addition,
                reason: null,
              }));
            }}
          />
          <Typography sx={{ alignSelf: 'center' }}>{t('label.by')}</Typography>
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
            isVaccine,
            isDispensary: store?.storeMode === StoreModeNodeType.Dispensary,
            isInventoryReduction,
          })}
          fallbackType={
            isInventoryReduction
              ? ReasonOptionNodeType.NegativeInventoryAdjustment
              : ReasonOptionNodeType.PositiveInventoryAdjustment
          }
          width="20em"
        />
      </Box>
    </Box>
  );
};
