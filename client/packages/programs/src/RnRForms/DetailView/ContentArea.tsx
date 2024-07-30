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
  useTheme,
  useTranslation,
  VenCategoryType,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../../api/operations.generated';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
}

export const ContentArea = ({ data }: ContentAreaProps) => {
  const t = useTranslation('replenishment');

  return data.length === 0 ? (
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
            <th>{t('label.rnr-adjustments')}</th>
            <th>{t('label.rnr-stock-out-duration')}</th>
            <th>{t('label.rnr-consumed-adjusted')}</th>
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
          {data.map((line, index) => (
            <RnRFormLine key={index} line={line} />
          ))}
        </tbody>
      </Table>
    </Box>
  );
};

export const RnRFormLine = ({ line }: { line: RnRFormLineFragment }) => {
  const theme = useTheme();

  const [patch, setPatch] = useState<Partial<RnRFormLineFragment>>({});
  const draft = { ...line, ...patch };
  const updateDraft = (update: Partial<RnRFormLineFragment>) =>
    setPatch({
      ...patch,
      confirmed: false,
      ...update,
    });

  const venCategory =
    draft.item.venCategory === VenCategoryType.NotAssigned
      ? ''
      : draft.item.venCategory;

  const textColor = draft.confirmed
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
      />
      <RnRNumberCell
        value={draft.quantityReceived}
        onChange={val => updateDraft({ quantityReceived: val })}
        textColor={textColor}
      />
      <RnRNumberCell
        value={draft.quantityConsumed}
        onChange={val => updateDraft({ quantityConsumed: val })}
        textColor={textColor}
      />
      <RnRNumberCell
        value={draft.adjustments}
        onChange={val => updateDraft({ adjustments: val })}
        textColor={textColor}
      />
      <RnRNumberCell
        value={draft.stockOutDuration}
        textColor={textColor}
        onChange={val => updateDraft({ stockOutDuration: val })}
      />

      {/* Readonly calculated values */}
      <RnRNumberCell
        disabled
        textColor={textColor}
        value={draft.adjustedQuantityConsumed}
        onChange={() => {}}
      />
      <RnRNumberCell
        disabled
        value={draft.finalBalance}
        textColor={textColor}
        onChange={() => {}}
      />
      <RnRNumberCell
        disabled
        value={draft.averageMonthlyConsumption}
        onChange={() => {}}
        textColor={textColor}
      />
      <RnRNumberCell
        disabled
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
        />
      </td>
      <RnRNumberCell
        value={draft.requestedQuantity}
        onChange={val => updateDraft({ requestedQuantity: val })}
        textColor={textColor}
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
        />
      </td>

      {/* Confirm the line */}
      <td style={{ textAlign: 'center' }}>
        <Checkbox
          checked={!!draft.confirmed}
          size="medium"
          onClick={() => {
            // TODO: save here!
            updateDraft({ confirmed: !draft.confirmed });
          }}
        />
      </td>
    </tr>
  );
};

const RnRNumberCell = ({
  value,
  disabled,
  onChange,
  textColor,
}: {
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
  textColor?: string;
}) => {
  const theme = useTheme();
  const backgroundColor = disabled ? theme.palette.background.drawer : 'white';

  return (
    <td style={{ backgroundColor }}>
      <NumericTextInput
        InputProps={{
          sx: {
            backgroundColor,
            '& .MuiInput-input, .MuiInput-input.Mui-disabled': {
              color: textColor,
            },
          },
        }}
        value={value}
        disabled={disabled}
        onChange={val => onChange(val ?? 0)}
      />
    </td>
  );
};
