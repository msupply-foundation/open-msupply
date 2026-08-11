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
  DateTimePickerInput,
  DateUtils,
  Formatter,
  usePreferences,
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
  const { backdating } = usePreferences();

  const isInventoryReduction =
    draft.adjustmentType === AdjustmentTypeInput.Reduction;

  // Reductions are stamped at end of day, additions at start of day, so the
  // ledger entry sorts correctly within the backdated day. Today's date is not
  // backdated, so it yields null.
  const toBackdatedDatetime = (
    date: Date | null | undefined,
    isReduction: boolean
  ) =>
    date && !DateUtils.isToday(date)
      ? Formatter.toIsoString(
          isReduction ? DateUtils.endOfDayOrNull(date) : DateUtils.startOfDay(date)
        )
      : null;

  // +1 day buffer so the boundary date isn't rejected by server UTC check
  const minDate =
    backdating?.maxDays && backdating?.maxDays > 0
      ? DateUtils.addDays(new Date(), -backdating?.maxDays + 1)
      : undefined;

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
            data-testid="adjust-direction"
            value={draft.adjustmentType}
            onChange={adjustmentType => {
              const type = adjustmentType ?? AdjustmentTypeInput.Addition;
              setDraft(state => ({
                ...state,
                adjustmentType: type,
                reason: null,
                // Recompute the time component so it matches the new direction,
                // rather than keeping whatever was set when the date was picked.
                backdatedDatetime: state.backdatedDatetime
                  ? toBackdatedDatetime(
                      new Date(state.backdatedDatetime),
                      type === AdjustmentTypeInput.Reduction
                    )
                  : null,
              }));
            }}
          />
          <Typography sx={{ alignSelf: 'center' }}>{t('label.by')}</Typography>
          <NumericTextInput
            id="by"
            data-testid="adjust-amount"
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

      {backdating?.inventoryAdjustmentsEnabled && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <FormLabel sx={{ fontWeight: 'bold' }}>{t('label.date')}</FormLabel>
          <Box sx={{ width: '20em' }}>
            <DateTimePickerInput
              value={
                draft.backdatedDatetime
                  ? new Date(draft.backdatedDatetime)
                  : new Date()
              }
              format="P"
              onChange={date =>
                setDraft(state => ({
                  ...state,
                  backdatedDatetime: toBackdatedDatetime(
                    date,
                    isInventoryReduction
                  ),
                }))
              }
              maxDate={new Date()}
              minDate={minDate}
              textFieldTestId="adjust-date"
            />
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <FormLabel sx={{ fontWeight: 'bold' }} htmlFor="reason">
          {t('label.reason')}
        </FormLabel>

        <ReasonOptionsSearchInput
          id="reason"
          data-testid="adjust-reason"
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
