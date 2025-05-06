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

  // console.log('rendering', lineState?.line.id, lineId);

  if (!lineState) return null;

  const { line, setLine, highlight } = lineState;

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

  const readOnlyBackgroundColor = theme.palette.background.drawer;
  const highlightColour = theme.palette.chart.cold.light;

  const readOnlyColumn = {
    backgroundColor: readOnlyBackgroundColor,
    padding: '5px',
    color: textColor,
  };
  const itemDetailStyle = {
    ...readOnlyColumn,
    backgroundColor: highlight ? highlightColour : readOnlyBackgroundColor,
  };

  return (
    <tr>
      {/* Read only Item data */}
      {/* Add the tooltip here, as we hide overflow in the code column
          to fix the code column width for side scroll */}
      <Tooltip title={line.item.code}>
        <td className="sticky-column first-column" style={itemDetailStyle}>
          {line.item.code}
        </td>
      </Tooltip>
      <td className="sticky-column second-column" style={itemDetailStyle}>
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
        backgroundColor={readOnlyBackgroundColor}
        textColor={textColor}
        value={line.adjustedQuantityConsumed}
      />

      <RnRNumberCell
        value={line.losses}
        onChange={val => updateDraft({ losses: val })}
        textColor={textColor}
        disabled={disabled}
      />

      <RnRNumberCell
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
        backgroundColor={readOnlyBackgroundColor}
        value={line.finalBalance}
        error={line.finalBalance < 0}
        textColor={textColor}
      />
      <RnRNumberCell
        backgroundColor={readOnlyBackgroundColor}
        value={line.averageMonthlyConsumption}
        textColor={textColor}
      />
      <RnRNumberCell
        backgroundColor={readOnlyBackgroundColor}
        value={line.minimumQuantity}
        textColor={textColor}
      />
      <RnRNumberCell
        backgroundColor={readOnlyBackgroundColor}
        value={line.maximumQuantity}
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
        backgroundColor={readOnlyBackgroundColor}
        value={line.approvedQuantity ?? 0}
        textColor={textColor}
      />
    </tr>
  );
};

const RnRNumberCell = ({
  value,
  disabled,
  onChange,
  textColor,
  backgroundColor: inputBackgroundColor,
  max,
  error,
  allowNegative,
}: {
  value: number;
  error?: boolean;
  disabled?: boolean;
  onChange?: (val: number) => void;
  textColor?: string;
  backgroundColor?: string;
  max?: number;
  allowNegative?: boolean;
}) => {
  const [buffer, setBuffer] = useBufferState<number | undefined>(
    NumUtils.round(value)
  );

  const backgroundColor = inputBackgroundColor ?? 'white';

  return (
    <td style={{ backgroundColor }}>
      <Tooltip title={value === buffer ? '' : value}>
        {disabled || !onChange ? (
          <p
            style={{
              padding: '8px',
              textAlign: 'right',
              color: textColor,
            }}
          >
            {buffer}
          </p>
        ) : (
          <NumericTextInput
            slotProps={{
              input: {
                sx: {
                  backgroundColor,
                  '& .MuiInput-input': {
                    WebkitTextFillColor: textColor,
                  },
                },
              },
              htmlInput: {
                sx: {
                  backgroundColor,
                },
              },
            }}
            error={error}
            value={buffer}
            disabled={disabled}
            onChange={newValue => {
              setBuffer(newValue);
              if (newValue !== undefined) onChange(newValue);
            }}
            max={max}
            allowNegative={allowNegative}
            defaultValue={0}
            // NOTE: setting input mode to text, because on Samsung tablets,
            // the numeric keyboard doesn't allow entering negative numbers!
            inputMode={allowNegative ? 'text' : 'numeric'}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;

              e.preventDefault();
              sendTabKeyPress();
            }}
            onFocus={e => e.target.select()}
          />
        )}
      </Tooltip>
    </td>
  );
};
