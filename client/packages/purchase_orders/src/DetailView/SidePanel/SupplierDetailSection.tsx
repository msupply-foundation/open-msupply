import React, { ReactElement, useState } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  NumericTextInput,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { CurrencyAutocomplete } from '@openmsupply-client/system';
import { PurchaseOrderFragment } from '../../api';
import { UpdatePurchaseOrderInput } from '../../api/hooks/usePurchaseOrder';

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
  const [currencyId, setCurrencyId] = useState(data?.currencyId);
  const [foreignExchangeRate, setForeignExchangeRate] = useState(
    data?.foreignExchangeRate ?? 0
  );
  const [supplierDiscountPercentage, setSupplierDiscountPercentage] = useState(
    data?.supplierDiscountPercentage ?? 0
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
          <PanelLabel>{t('label.supplier-discount-percentage')}</PanelLabel>
          <NumericTextInput
            value={supplierDiscountPercentage}
            max={100}
            onChange={value => {
              if (value == null || value === supplierDiscountPercentage) return;
              setSupplierDiscountPercentage(value);
              handleDebouncedUpdate({
                supplierDiscountPercentage: value,
              });
            }}
            slotProps={slotProps}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.supplier-discount-amount')}</PanelLabel>
          <NumericTextInput
            value={data?.supplierDiscountAmount ?? 0}
            max={100}
            disabled
            slotProps={slotProps}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.currency')}</PanelLabel>
          <CurrencyAutocomplete
            currencyId={currencyId}
            onChange={currency => {
              if (currency == null) return;
              setCurrencyId(currency.id);
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
            disabled={!!data?.confirmedDatetime}
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
            decimalLimit={4}
            slotProps={slotProps}
            disabled={!!data?.confirmedDatetime}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
