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

  const venCategory =
    draft.item.venCategory === VenCategoryType.NotAssigned
      ? ''
      : draft.item.venCategory;

  const readOnlyColumn = {
    backgroundColor: theme.palette.background.drawer,
    padding: '5px',
  };

  return (
    <tr>
      <td style={readOnlyColumn}>{draft.item.code}</td>
      <td style={readOnlyColumn}>{draft.item.name}</td>
      <td style={readOnlyColumn}>{draft.item.strength}</td>
      <td style={readOnlyColumn}>{draft.item.unitName}</td>
      <td style={{ ...readOnlyColumn, textAlign: 'center' }}>{venCategory}</td>
      <RnRNumberCell
        value={draft.initialBalance}
        onChange={val => setPatch({ ...patch, initialBalance: val })}
      />
      <RnRNumberCell
        value={draft.quantityReceived}
        onChange={val => setPatch({ ...patch, quantityReceived: val })}
      />
      <RnRNumberCell
        value={draft.quantityConsumed}
        onChange={val => setPatch({ ...patch, quantityConsumed: val })}
      />
      <RnRNumberCell
        value={draft.adjustments}
        onChange={val => setPatch({ ...patch, adjustments: val })}
      />
      <RnRNumberCell
        value={draft.stockOutDuration}
        onChange={val => setPatch({ ...patch, stockOutDuration: val })}
      />
      <RnRNumberCell
        disabled
        value={draft.adjustedQuantityConsumed}
        onChange={() => {}}
      />
      <RnRNumberCell disabled value={draft.finalBalance} onChange={() => {}} />
      <RnRNumberCell
        disabled
        value={draft.averageMonthlyConsumption}
        onChange={() => {}}
      />
      <RnRNumberCell
        disabled
        value={draft.maximumQuantity}
        onChange={() => {}}
      />
      <td>
        <DatePicker
          sx={{ width: '160px', '& fieldset': { border: 'none' } }}
          value={draft.expiryDate ? new Date(draft.expiryDate) : null}
          onChange={date =>
            setPatch({ ...patch, expiryDate: Formatter.naiveDate(date) })
          }
        />
      </td>
      <RnRNumberCell
        value={draft.requestedQuantity}
        onChange={val => setPatch({ ...patch, requestedQuantity: val })}
      />
      <td>
        <BasicTextInput
          multiline
          sx={{ width: '200px' }}
          InputProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
            },
          }}
          value={draft.comment ?? ''}
          onChange={e => setPatch({ ...patch, comment: e.target.value })}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        <Checkbox
          checked={!!draft.confirmed}
          size="medium"
          onClick={() => {
            // TODO: save here!
            setPatch({ ...patch, confirmed: !draft.confirmed });
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
}: {
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}) => {
  const theme = useTheme();
  const disabledStyle = {
    backgroundColor: theme.palette.background.drawer,
    // color: theme.palette.text.disabled,
  };

  return (
    <td style={disabled ? disabledStyle : {}}>
      <NumericTextInput
        InputProps={{
          sx: {
            backgroundColor: disabled ? disabledStyle.backgroundColor : 'white',
          },
        }}
        value={value}
        disabled={disabled}
        onChange={val => onChange(val ?? 0)}
      />
    </td>
  );
};
