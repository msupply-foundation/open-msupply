import React, { useState } from 'react';
import {
  BasicTextInput,
  Box,
  Checkbox,
  DatePicker,
  Formatter,
  NothingHere,
  NumericTextInput,
  Table,
  useBufferState,
  useNotification,
  useTheme,
  useTranslation,
  VenCategoryType,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../../api/operations.generated';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
  periodLength: number;
  disabled: boolean;
}

export const ContentArea = ({
  data,
  saveLine,
  periodLength,
  disabled,
}: ContentAreaProps) => {
  const t = useTranslation('replenishment');

  // TODO: move to backend, should join on item and sort by name!
  const lines = data.sort((a, b) => (a.item.name > b.item.name ? 1 : -1));

  return lines.length === 0 ? (
    <NothingHere body={t('error.no-items')} />
  ) : (
    <Box flex={1} padding={2}>
      <Table
        sx={{
          '& th': {
            textAlign: 'left',
            padding: 1,
            fontWeight: 'bold',
            border: '1px solid lightgray',
          },
          '& td': {
            padding: '2px',
            border: '1px solid lightgray',
          },
        }}
      >
        <thead>
          <tr>
            <th style={{ width: '80px' }}>{t('label.code')}</th>
            <th style={{ minWidth: '300px' }}>{t('label.name')}</th>
            <th>{t('label.strength')}</th>
            <th>{t('label.unit')}</th>
            <th>{t('label.ven')}</th>
            <th>{t('label.rnr-initial-balance')}</th>
            <th>{t('label.rnr-received')}</th>
            <th>{t('label.rnr-consumed')}</th>
            <th>{t('label.rnr-consumed-adjusted')}</th>
            <th>{t('label.rnr-adjustments')}</th>
            <th>{t('label.rnr-stock-out-duration')}</th>
            <th>{t('label.rnr-final-balance')}</th>
            <th>{t('label.amc')}</th>
            <th>{t('label.rnr-maximum-quantity')}</th>
            <th>{t('label.expiry')}</th>
            <th>{t('label.requested-quantity')}</th>
            <th>{t('label.comment')}</th>
            <th>{t('label.confirmed')}</th>
          </tr>
        </thead>

        <tbody>
          {lines.map(line => (
            <RnRFormLine
              key={line.id}
              line={line}
              periodLength={periodLength}
              saveLine={saveLine}
              disabled={disabled}
            />
          ))}
        </tbody>
      </Table>
    </Box>
  );
};

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
      previousAverageMonthlyConsumption,
    } = { ...draft, ...newPatch };

    const finalBalance =
      initialBalance + quantityReceived - quantityConsumed + adjustments;

    const stockAvailableDays = periodLength - stockOutDuration;
    const adjustedQuantityConsumed = stockAvailableDays
      ? quantityConsumed * (periodLength / stockAvailableDays)
      : quantityConsumed;

    // This calculation might be a plugin in future!
    const averageMonthlyConsumption =
      // Average of the last 3 months (including the current month)
      // TODO: what if don't want to consider previous months?
      (2 * previousAverageMonthlyConsumption + adjustedQuantityConsumed) / 3;

    const maximumQuantity = averageMonthlyConsumption * 2;

    const neededQuantity = maximumQuantity - finalBalance;
    const requestedQuantity = neededQuantity > 0 ? neededQuantity : 0;

    setPatch({
      ...newPatch,
      finalBalance,
      adjustedQuantityConsumed,
      averageMonthlyConsumption,
      maximumQuantity,
      requestedQuantity,
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
      <td style={readOnlyColumn}>{draft.item.code}</td>
      <td style={readOnlyColumn}>{draft.item.name}</td>
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
        value={draft.requestedQuantity}
        onChange={val => updateDraft({ requestedQuantity: val })}
        textColor={textColor}
        disabled={disabled}
      />
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

  const [buffer, setBuffer] = useBufferState<number | undefined>(value);

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
      />
    </td>
  );
};
