import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  UpdatePurchaseOrderInput,
  DateTimePickerInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface DateSectionProps {
  data?: PurchaseOrderFragment;
  onUpdate: (input: Partial<UpdatePurchaseOrderInput>) => void;
}

export const DateSection = ({
  data,
  onUpdate,
}: DateSectionProps): ReactElement => {
  const t = useTranslation();

  return (
    <DetailPanelSection title={t('label.dates')}>
      <Grid container gap={2} key="dates-section">
        <DateField
          type="datetime"
          label={t('label.confirmed')}
          value={data?.confirmedDatetime}
          onChange={() => {}}
          disabled
        />
        <DateField
          type="datetime"
          label={t('label.po-sent')}
          value={data?.sentDatetime}
          onChange={date => onUpdate({ sentDatetime: date })}
        />
        <DateField
          label={t('label.contract-signed')}
          value={data?.contractSignedDate}
          onChange={date => onUpdate({ contractSignedDate: date })}
        />
        <DateField
          label={t('label.advanced-paid')}
          value={data?.advancePaidDate}
          onChange={date => onUpdate({ advancePaidDate: date })}
        />
        <DateField
          label={t('label.received-at-port')}
          value={data?.receivedAtPortDate}
          onChange={date => onUpdate({ receivedAtPortDate: date })}
        />
      </Grid>
    </DetailPanelSection>
  );
};

interface DateFieldProps {
  label: string;
  value?: string | null;
  onChange: (date: string | null) => void;
  disabled?: boolean;
  type?: 'date' | 'datetime';
}

export const DateField = ({
  label,
  value,
  onChange,
  disabled = false,
  type = 'date',
}: DateFieldProps): ReactElement => {
  return (
    <PanelRow>
      <PanelLabel>{label}</PanelLabel>
      <DateTimePickerInput
        disabled={disabled}
        value={DateUtils.getDateOrNull(value)}
        format="P"
        onChange={date => {
          const formatted =
            date && type === 'datetime'
              ? Formatter.isoNoMs(date)
              : date
                ? Formatter.naiveDate(date)
                : null;
          onChange(formatted);
        }}
        sx={{ flex: 2 }}
        textFieldSx={{
          backgroundColor: 'white',
          width: 170,
        }}
        actions={['cancel', 'accept', 'clear']}
      />
    </PanelRow>
  );
};
