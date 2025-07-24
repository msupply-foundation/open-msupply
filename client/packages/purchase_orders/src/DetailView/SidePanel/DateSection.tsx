import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  PanelField,
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
        <PanelRow>
          <PanelLabel>{t('label.confirmation-date')}</PanelLabel>
          <PanelField>{data?.confirmedDatetime}</PanelField>
        </PanelRow>
        <DateField
          label={t('label.po-sent')}
          value={data?.sentDate}
          onChange={date => onUpdate({ sentDate: date })}
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
        <DateField
          label={t('label.expected-delivery-date')}
          value={data?.expectedDeliveryDate}
          onChange={date => onUpdate({ expectedDeliveryDate: date })}
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
}

export const DateField = ({
  label,
  value,
  onChange,
  disabled = false,
}: DateFieldProps): ReactElement => {
  return (
    <PanelRow>
      <PanelLabel>{label}</PanelLabel>
      <DateTimePickerInput
        disabled={disabled}
        value={DateUtils.getDateOrNull(value)}
        format="P"
        onChange={date => {
          const formatted = date ? Formatter.naiveDate(date) : null;
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
