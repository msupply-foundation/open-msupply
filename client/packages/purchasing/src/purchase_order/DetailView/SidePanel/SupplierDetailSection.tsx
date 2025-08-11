import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  NumericTextInput,
  useNotification,
} from '@openmsupply-client/common';
import {
  CurrencyAutocomplete,
  CurrencyRowFragment,
} from '@openmsupply-client/system';
import { PurchaseOrderFragment } from '../../api';

const slotProps = {
  input: {
    sx: {
      backgroundColor: 'white',
      width: 100,
    },
  },
  htmlInput: {
    sx: {
      backgroundColor: 'white',
    },
  },
};

interface SupplierDetailSectionProps {
  draft?: PurchaseOrderFragment;
  onChange: (input: Partial<PurchaseOrderFragment>) => void;
}

export const SupplierDetailSection = ({
  draft,
  onChange,
}: SupplierDetailSectionProps): ReactElement => {
  const t = useTranslation();
  const { warning } = useNotification();

  const handleSupplierDiscountChange = (value: number | undefined) => {
    if (value == null || value === draft?.supplierDiscountPercentage) return;
    onChange({ supplierDiscountPercentage: value });
  };

  const handleCurrencyChange = (currency: CurrencyRowFragment | null) => {
    if (!currency) return;
    onChange({
      currencyId: currency.id,
      foreignExchangeRate: currency.rate,
    });
  };

  const handleForeignExchangeRateChange = (value: number | undefined) => {
    if (value == null || value === draft?.foreignExchangeRate) return;
    if (draft?.foreignExchangeRate !== value) {
      warning(t('warning.foreign-exchange-rate-different'))();
      onChange({ foreignExchangeRate: value });
    }
  };

  return (
    <DetailPanelSection title={t('label.supplier-details')}>
      <Grid container gap={2} key="supplier-detail-section">
        <PanelRow>
          <PanelLabel>{t('label.supplier-discount-percentage')}</PanelLabel>
          <NumericTextInput
            value={draft?.supplierDiscountPercentage ?? 0}
            max={100}
            onChange={handleSupplierDiscountChange}
            slotProps={slotProps}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.supplier-discount-amount')}</PanelLabel>
          <NumericTextInput
            value={draft?.supplierDiscountAmount ?? 0}
            max={100}
            disabled
            slotProps={slotProps}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.currency')}</PanelLabel>
          <CurrencyAutocomplete
            currencyId={draft?.currencyId}
            onChange={handleCurrencyChange}
            width={100}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: 'white',
              },
            }}
            disabled={!!draft?.confirmedDatetime}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.foreign-exchange-rate')}</PanelLabel>
          <NumericTextInput
            value={draft?.foreignExchangeRate ?? 0}
            onChange={handleForeignExchangeRateChange}
            decimalLimit={4}
            slotProps={slotProps}
            disabled={!!draft?.confirmedDatetime}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
