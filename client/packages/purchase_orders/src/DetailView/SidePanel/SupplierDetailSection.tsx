import React, { ReactElement, useState } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  NumericTextInput,
  useDebounceCallback,
  UpdatePurchaseOrderInput,
} from '@openmsupply-client/common';
import {
  CurrencyAutocomplete,
  CurrencyRowFragment,
} from '@openmsupply-client/system';
import { PurchaseOrderFragment } from '../../api';

// TODO: CurrencyAutocomplete - not saving the currency id correctly

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

const DEBOUNCED_TIME = 1000;

interface SupplierDetailSectionProps {
  data?: PurchaseOrderFragment;
  onUpdate: (input: Partial<UpdatePurchaseOrderInput>) => void;
}

export const SupplierDetailSection = ({
  data,
  onUpdate,
}: SupplierDetailSectionProps): ReactElement => {
  const t = useTranslation();
  const [currency, setCurrency] = useState<CurrencyRowFragment>();
  const [foreignExchangeRate, setForeignExchangeRate] = useState(
    data?.foreignExchangeRate ?? 0
  );
  const [supplierDiscountAmount, setSupplierDiscountAmount] = useState(
    data?.supplierDiscountAmount ?? 0
  );

  const handleDebouncedUpdate = useDebounceCallback(
    onUpdate,
    [],
    DEBOUNCED_TIME
  );

  return (
    <DetailPanelSection title={t('label.supplier-details')}>
      <Grid container gap={2} key="supplier-detail-section">
        <PanelRow>
          <PanelLabel>{t('label.supplier-discount-amount')}</PanelLabel>
          <NumericTextInput
            value={supplierDiscountAmount}
            max={100}
            onChange={value => {
              if (value == null || value === supplierDiscountAmount) return;
              setSupplierDiscountAmount(value);
              handleDebouncedUpdate({
                supplierDiscountAmount: value,
              });
            }}
            slotProps={slotProps}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.currency')}</PanelLabel>
          <CurrencyAutocomplete
            value={currency}
            onChange={currency => {
              if (currency == null) return;
              setCurrency(currency);
              setForeignExchangeRate(currency.rate);
              handleDebouncedUpdate({
                currencyId: currency.id,
                foreignExchangeRate: currency.rate,
              });
            }}
            width={100}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: 'white',
              },
            }}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.foreign-exchange-rate')}</PanelLabel>
          <NumericTextInput
            value={foreignExchangeRate}
            onChange={value => {
              if (value == null || value === foreignExchangeRate) return;
              setForeignExchangeRate(value);
              handleDebouncedUpdate({
                foreignExchangeRate: value,
              });
            }}
            slotProps={slotProps}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
