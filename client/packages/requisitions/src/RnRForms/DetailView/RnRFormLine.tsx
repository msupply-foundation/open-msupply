import React, { useState } from 'react';
import {
  AlertIcon,
  BasicTextInput,
  Checkbox,
  DatePicker,
  Formatter,
  LowStockStatus,
  NumericTextInput,
  NumUtils,
  useBufferState,
  useNotification,
  useTheme,
  VenCategoryType,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../api/operations.generated';
import { getLowStockStatus, getAmc } from './helpers';

export const RnRFormLine = ({
  line,
  saveLine,
  periodLength,
  disabled,
}: {
  line: RnRFormLineFragment;
  periodLength: number;
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
  disabled: boolean;
}) => {
  const theme = useTheme();
  const { error } = useNotification();

  const [patch, setPatch] = useState<Partial<RnRFormLineFragment>>({});
  const draft = { ...line, ...patch };

  const updateDraft = (update: Partial<RnRFormLineFragment>) => {
    const newPatch = {
      ...patch,
      confirmed: false,
      ...update,
    };

    const {
      initialBalance,
      quantityConsumed,
      quantityReceived,
      adjustments,
      stockOutDuration,
      previousMonthlyConsumptionValues,
    } = { ...draft, ...newPatch };

    const finalBalance =
      initialBalance + quantityReceived - quantityConsumed + adjustments;

    const stockAvailableDays = periodLength - stockOutDuration;

    const adjustedQuantityConsumed = stockAvailableDays
      ? quantityConsumed * (periodLength / stockAvailableDays)
      : quantityConsumed;

    // This calculation might be a plugin in future!
    const averageMonthlyConsumption = getAmc(
      previousMonthlyConsumptionValues,
      adjustedQuantityConsumed,
      periodLength
    );

    const maximumQuantity = averageMonthlyConsumption * 2;

    const neededQuantity = maximumQuantity - finalBalance;

    const calculatedRequestedQuantity = neededQuantity > 0 ? neededQuantity : 0;

    const lowStock = getLowStockStatus(finalBalance, maximumQuantity);

    setPatch({
      ...newPatch,
      finalBalance,
      adjustedQuantityConsumed,
      averageMonthlyConsumption,
      maximumQuantity,
      calculatedRequestedQuantity,
      lowStock,
    });
  };

  const venCategory =
    draft.item.venCategory === VenCategoryType.NotAssigned
      ? ''
      : draft.item.venCategory;

  const textColor =
    disabled || draft.confirmed
      ? theme.palette.text.disabled
      : theme.palette.text.primary;

  const readOnlyColumn = {
    backgroundColor: theme.palette.background.drawer,
    padding: '5px',
    color: textColor,
  };

  return (
    <tr>
      {/* Read only Item data */}
      <td className="sticky-column first-column" style={readOnlyColumn}>
        {draft.item.code}
      </td>
      <td style={readOnlyColumn} className="sticky-column second-column">
        {draft.item.name}
      </td>
      <td style={readOnlyColumn}>{draft.item.strength}</td>
      <td style={readOnlyColumn}>{draft.item.unitName}</td>
      <td style={{ ...readOnlyColumn, textAlign: 'center' }}>{venCategory}</td>

      {/* Enterable consumption data */}
      <RnRNumberCell
        value={draft.initialBalance}
        onChange={val => updateDraft({ initialBalance: val })}
        textColor={textColor}
        disabled={disabled}
      />
      <RnRNumberCell
        value={draft.quantityReceived}
        onChange={val => updateDraft({ quantityReceived: val })}
        textColor={textColor}
        disabled={disabled}
      />
      <RnRNumberCell
        value={draft.quantityConsumed}
        onChange={val => updateDraft({ quantityConsumed: val })}
        textColor={textColor}
        disabled={disabled}
      />

      {/* Readonly calculated value */}
      <RnRNumberCell
        readOnly
        textColor={textColor}
        value={draft.adjustedQuantityConsumed}
        onChange={() => {}}
      />

      {/* Losses/adjustments and stock out */}
      <RnRNumberCell
        value={draft.adjustments}
        onChange={val => updateDraft({ adjustments: val })}
        textColor={textColor}
        allowNegative
        disabled={disabled}
      />
      <RnRNumberCell
        value={draft.stockOutDuration}
        textColor={textColor}
        onChange={val => updateDraft({ stockOutDuration: val })}
        max={periodLength}
        disabled={disabled}
      />

      {/* Readonly calculated values */}
      <RnRNumberCell
        readOnly
        value={draft.finalBalance}
        textColor={textColor}
        onChange={() => {}}
      />
      <RnRNumberCell
        readOnly
        value={draft.averageMonthlyConsumption}
        onChange={() => {}}
        textColor={textColor}
      />
      <RnRNumberCell
        readOnly
        value={draft.maximumQuantity}
        onChange={() => {}}
        textColor={textColor}
      />

      {/* Enterable fields: expiry, requested quantity, comment */}
      <td>
        <DatePicker
          sx={{
            width: '160px',
            '& fieldset': { border: 'none' },
            '& input': { color: textColor },
          }}
          value={draft.expiryDate ? new Date(draft.expiryDate) : null}
          onChange={date =>
            updateDraft({ expiryDate: Formatter.naiveDate(date) })
          }
          disabled={disabled}
        />
      </td>
      <RnRNumberCell
        value={
          draft.enteredRequestedQuantity ?? draft.calculatedRequestedQuantity
        }
        onChange={val => updateDraft({ enteredRequestedQuantity: val })}
        textColor={textColor}
        disabled={disabled}
      />
      <td style={{ ...readOnlyColumn, textAlign: 'center' }}>
        {draft.lowStock !== LowStockStatus.Ok && (
          <AlertIcon
            double={draft.lowStock === LowStockStatus.BelowQuarter}
            sx={{
              color:
                draft.lowStock === LowStockStatus.BelowQuarter
                  ? 'error.main'
                  : 'primary.light',
            }}
          />
        )}
      </td>
      <td>
        <BasicTextInput
          multiline
          sx={{ width: '200px', color: textColor }}
          InputProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
              '& .MuiInput-input': { color: textColor },
            },
          }}
          value={draft.comment ?? ''}
          onChange={e => updateDraft({ comment: e.target.value })}
          disabled={disabled}
        />
      </td>

      {/* Confirm the line */}
      <td style={{ textAlign: 'center' }}>
        <Checkbox
          checked={!!draft.confirmed}
          size="medium"
          onClick={async () => {
            try {
              await saveLine({ ...draft, confirmed: !draft.confirmed });
              setPatch({});
            } catch (e) {
              error((e as Error).message)();
            }
          }}
          disabled={disabled}
        />
      </td>
      {/* Readonly - populated from Response Requisition */}
      <RnRNumberCell
        readOnly
        value={draft.approvedQuantity ?? 0}
        textColor={textColor}
        onChange={() => {}}
      />
    </tr>
  );
};

const RnRNumberCell = ({
  value,
  disabled,
  readOnly,
  onChange,
  textColor,
  max,
  allowNegative,
}: {
  value: number;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: number) => void;
  textColor?: string;
  max?: number;
  allowNegative?: boolean;
}) => {
  const theme = useTheme();
  const backgroundColor = readOnly ? theme.palette.background.drawer : 'white';

  const [buffer, setBuffer] = useBufferState<number | undefined>(
    NumUtils.round(value, 2)
  );

  return (
    <td style={{ backgroundColor }}>
      <NumericTextInput
        InputProps={{
          sx: {
            backgroundColor,
            '& .MuiInput-input': {
              WebkitTextFillColor: textColor,
            },
          },
        }}
        value={buffer}
        disabled={readOnly ?? disabled}
        onChange={newValue => {
          setBuffer(newValue);
          if (newValue !== undefined) onChange(newValue);
        }}
        max={max}
        allowNegative={allowNegative}
        defaultValue={0}
      />
    </td>
  );
};
