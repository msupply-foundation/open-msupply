import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  DateTimePickerInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface DateSectionProps {
  draft?: PurchaseOrderFragment;
  onUpdate: (input: Partial<PurchaseOrderFragment>) => void;
}

export const DateSection = ({
  draft,
  onUpdate,
}: DateSectionProps): ReactElement => {
  const t = useTranslation();

  return (
    <DetailPanelSection title={t('label.dates')}>
      <Grid container gap={2} key="dates-section">
        <DateField
          type="datetime"
          label={t('label.confirmed')}
          value={draft?.confirmedDatetime}
          onChange={() => {}}
          disabled
        />
        <DateField
          type="datetime"
          label={t('label.po-sent')}
          value={draft?.sentDatetime}
          onChange={date => onUpdate({ sentDatetime: date })}
        />
        <DateField
          label={t('label.contract-signed')}
          value={draft?.contractSignedDate}
          onChange={date => onUpdate({ contractSignedDate: date })}
        />
        <DateField
          label={t('label.advance-paid')}
          value={draft?.advancePaidDate}
          onChange={date => onUpdate({ advancePaidDate: date })}
        />
        <DateField
          label={t('label.received-at-port')}
          value={draft?.receivedAtPortDate}
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
  const formatDateValue = (date: Date | null, type: 'date' | 'datetime') => {
    if (!date) return null;
    if (type === 'datetime') return Formatter.naiveDateTime(date);
    return Formatter.naiveDate(date);
  };

  const handleChange = (date: Date | null) => {
    onChange(formatDateValue(date, type));
  };

  return (
    <PanelRow>
      <PanelLabel>{label}</PanelLabel>
      <DateTimePickerInput
        disabled={disabled}
        value={DateUtils.getDateOrNull(value)}
        format="P"
        onChange={handleChange}
        textFieldSx={{
          backgroundColor: 'white',
        }}
        actions={['cancel', 'accept', 'clear']}
      />
    </PanelRow>
  );
};
