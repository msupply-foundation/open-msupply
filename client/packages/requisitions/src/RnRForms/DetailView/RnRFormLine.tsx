import React from 'react';
import {
  AlertIcon,
  BasicTextInput,
  Checkbox,
  CircleIcon,
  DatePicker,
  Formatter,
  LowStockStatus,
  NumericTextInput,
  NumUtils,
  sendTabKeyPress,
  Tooltip,
  useAuthContext,
  useBufferState,
  useNativeClient,
  useNotification,
  useTheme,
  VenCategoryType,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../api/operations.generated';
import { getLowStockStatus, getAmc } from './helpers';
import { useCachedRnRDraftLine, useRnRFormContext } from '../api';

export const RnRFormLine = ({
  periodLength,
  disabled,
  lineId,
}: {
  lineId: string;

  periodLength: number;
  disabled: boolean;
}) => {
  const theme = useTheme();
  const { store } = useAuthContext();
  const { error } = useNotification();
  const lineState = useRnRFormContext(useCachedRnRDraftLine(lineId));

  console.log('rendering', lineState?.line.id, lineId);

  if (!lineState) return null;

  const { line, setLine } = lineState;

  const updateDraft = (update: Partial<RnRFormLineFragment>) => {
    const newPatch = {
      ...line,
      confirmed: false,
      ...update,
    };

    const {
      initialBalance,
      quantityConsumed,
      quantityReceived,
      adjustments,
      losses,
      stockOutDuration,
      previousMonthlyConsumptionValues,
    } = { ...newPatch };

    const finalBalance =
      initialBalance +
      quantityReceived -
      quantityConsumed +
      adjustments -
      losses;

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

    const storePreferences = store?.preferences;

    const maximumQuantity =
      averageMonthlyConsumption * (storePreferences?.monthsOverstock ?? 2);
    const minimumQuantity =
      averageMonthlyConsumption * (storePreferences?.monthsUnderstock ?? 0);

    const neededQuantity = maximumQuantity - finalBalance;

    const calculatedRequestedQuantity = neededQuantity > 0 ? neededQuantity : 0;

    const lowStock = getLowStockStatus(finalBalance, maximumQuantity);

    setLine({
      ...newPatch,
      finalBalance,
      adjustedQuantityConsumed,
      averageMonthlyConsumption,
      minimumQuantity,
      maximumQuantity,
      calculatedRequestedQuantity,
      lowStock,
    });
  };

  const venCategory =
    line.item.venCategory === VenCategoryType.NotAssigned
      ? ''
      : line.item.venCategory;

  const textColor =
    disabled || line.confirmed
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
      {/* Add the tooltip here, as we hide overflow in the code column
          to fix the code column width for side scroll */}
      <Tooltip title={line.item.code}>
        <td className="sticky-column first-column" style={readOnlyColumn}>
          {line.item.code}
        </td>
      </Tooltip>
      <td style={readOnlyColumn} className="sticky-column second-column">
        {line.item.name}
      </td>
      <td style={readOnlyColumn}>{line.item.strength}</td>
      <td style={readOnlyColumn}>{line.item.unitName}</td>
      <td style={{ ...readOnlyColumn, textAlign: 'center' }}>{venCategory}</td>

      {/* Enterable consumption data */}
      <RnRNumberCell
        value={line.initialBalance}
        onChange={val => updateDraft({ initialBalance: val })}
        textColor={textColor}
        disabled={disabled}
      />
      <RnRNumberCell
        value={line.quantityReceived}
        onChange={val => updateDraft({ quantityReceived: val })}
        textColor={textColor}
        disabled={disabled}
      />
      <RnRNumberCell
        value={line.quantityConsumed}
        onChange={val => updateDraft({ quantityConsumed: val })}
        textColor={textColor}
        disabled={disabled}
      />

      {/* Readonly calculated value */}
      <RnRNumberCell
        readOnly
        textColor={textColor}
        value={line.adjustedQuantityConsumed}
        onChange={() => {}}
      />

      <RnRNumberCell
        value={line.losses}
        onChange={val => updateDraft({ losses: val })}
        textColor={textColor}
        allowNegative
        disabled={disabled}
      />

      <RnRNumberCell
        inputMode={
          'text' /* Some number keyboards don't have the minus, thus using normal text */
        }
        value={line.adjustments}
        onChange={val => updateDraft({ adjustments: val })}
        textColor={textColor}
        allowNegative
        disabled={disabled}
      />
      <RnRNumberCell
        value={line.stockOutDuration}
        textColor={textColor}
        onChange={val => updateDraft({ stockOutDuration: val })}
        max={periodLength}
        disabled={disabled}
      />

      {/* Readonly calculated values */}
      <RnRNumberCell
        readOnly
        value={line.finalBalance}
        error={line.finalBalance < 0}
        textColor={textColor}
        onChange={() => {}}
      />
      <RnRNumberCell
        readOnly
        value={line.averageMonthlyConsumption}
        onChange={() => {}}
        textColor={textColor}
      />
      <RnRNumberCell
        readOnly
        value={line.minimumQuantity}
        onChange={() => {}}
        textColor={textColor}
      />
      <RnRNumberCell
        readOnly
        value={line.maximumQuantity}
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
          value={line.expiryDate ? new Date(line.expiryDate) : null}
          onChange={date =>
            updateDraft({ expiryDate: Formatter.naiveDate(date) })
          }
          disabled={disabled}
        />
      </td>
      <RnRNumberCell
        value={
          line.enteredRequestedQuantity ?? line.calculatedRequestedQuantity
        }
        onChange={val => updateDraft({ enteredRequestedQuantity: val })}
        textColor={textColor}
        disabled={disabled}
      />
      <td style={{ ...readOnlyColumn, textAlign: 'center' }}>
        {line.lowStock !== LowStockStatus.Ok && (
          <AlertIcon
            double={line.lowStock === LowStockStatus.BelowQuarter}
            sx={{
              color:
                line.lowStock === LowStockStatus.BelowQuarter
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
          slotProps={{
            input: {
              sx: {
                backgroundColor: theme.palette.background.default,
                '& .MuiInput-input': { color: textColor },
              },
            },
          }}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            sendTabKeyPress();
          }}
          value={line.comment ?? ''}
          onChange={e => updateDraft({ comment: e.target.value })}
          disabled={disabled}
        />
      </td>

      {/* Confirm the line */}
      <td style={{ textAlign: 'center' }}>
        {
          <>
            <Checkbox
              tabIndex={-1}
              checked={!!line.confirmed}
              size="medium"
              onClick={async () => {
                if (line.finalBalance < 0) {
                  error('Final balance should not be below 0')();
                  return;
                }
                setLine({ ...line, confirmed: !line.confirmed });
              }}
              disabled={disabled}
              sx={{ marginLeft: '10px' }}
            />
            <CircleIcon
              sx={{
                width: '10px',
                visibility: line?.isDirty ? 'visible' : 'hidden',
                color: 'secondary.main',
              }}
            />
          </>
        }
      </td>
      {/* Readonly - populated from Response Requisition */}
      <RnRNumberCell
        readOnly
        value={line.approvedQuantity ?? 0}
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
  error,
  allowNegative,
  inputMode = 'numeric',
}: {
  value: number;
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (val: number) => void;
  textColor?: string;
  max?: number;
  allowNegative?: boolean;
  inputMode?: 'numeric' | 'text';
}) => {
  const theme = useTheme();
  const backgroundColor = readOnly ? theme.palette.background.drawer : 'white';
  const [buffer, setBuffer] = useBufferState<number | undefined>(
    NumUtils.round(value)
  );

  return (
    <td style={{ backgroundColor }}>
      <Tooltip title={value === buffer ? '' : value}>
        <NumericTextInput
          InputProps={{
            sx: {
              backgroundColor,
              '& .MuiInput-input': {
                WebkitTextFillColor: textColor,
              },
            },
          }}
          error={error}
          value={buffer}
          disabled={readOnly ?? disabled}
          onChange={newValue => {
            setBuffer(newValue);
            if (newValue !== undefined) onChange(newValue);
          }}
          max={max}
          allowNegative={allowNegative}
          defaultValue={0}
          // NOTE: not setting input mode to text, because on Samsung tablets,
          // the numeric keyboard doesn't allow entering negative numbers!
          // Only needed for the negative columns, but better feel to have a consistent
          // keyboard as you click through the whole R&R form
          inputMode={inputMode}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            sendTabKeyPress();
          }}
          onFocus={e => e.target.select()}
        />
      </Tooltip>
    </td>
  );
};
