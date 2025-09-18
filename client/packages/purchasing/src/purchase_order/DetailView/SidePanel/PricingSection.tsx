import React from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  useFormatCurrency,
  PanelField,
  splitTranslatedLines,
  NumericTextInput,
} from '@openmsupply-client/common';
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

interface PricingSectionProps {
  draft?: PurchaseOrderFragment;
  onChange: (input: Partial<PurchaseOrderFragment>) => void;
  disabled: boolean;
}

export const PricingSection = ({
  draft,
  onChange,
  disabled,
}: PricingSectionProps) => {
  const t = useTranslation();
  const c = useFormatCurrency();

  if (!draft) return null;

  const {
    agentCommission = 0,
    documentCharge = 0,
    communicationsCharge = 0,
    insuranceCharge = 0,
    freightCharge = 0,
  } = draft;

  const additionalFees =
    (agentCommission ?? 0) +
    (documentCharge ?? 0) +
    (communicationsCharge ?? 0) +
    (insuranceCharge ?? 0) +
    (freightCharge ?? 0);

  const handleSupplierDiscountChange = (value: number | undefined) => {
    if (value == null || value === draft?.supplierDiscountPercentage) return;
    onChange({ supplierDiscountPercentage: value });
  };

  const handleSupplierDiscountAmountChange = (value: number | undefined) => {
    if (value == null || value === draft?.supplierDiscountAmount) return;
    onChange({ supplierDiscountAmount: value });
  };

  return (
    <DetailPanelSection title={t('title.pricing')}>
      <Grid container gap={1} key="pricing-section">
        <PanelRow>
          <PanelLabel>{t('label.cost-subtotal')}</PanelLabel>
          <PanelField>{c(draft.orderTotalBeforeDiscount)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>
            {splitTranslatedLines(t('label.cost-additional-fees'))}
          </PanelLabel>
          <PanelField>{c(additionalFees)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.supplier-discount-percentage')}</PanelLabel>
          <NumericTextInput
            value={draft?.supplierDiscountPercentage ?? 0}
            max={100}
            onChange={handleSupplierDiscountChange}
            slotProps={slotProps}
            endAdornment="%"
            disabled={disabled}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.supplier-discount-amount')}</PanelLabel>
          <NumericTextInput
            value={draft?.supplierDiscountAmount ?? 0}
            slotProps={slotProps}
            onChange={handleSupplierDiscountAmountChange}
            disabled={disabled}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.cost-final')}</PanelLabel>
          <PanelField>
            {c(draft.orderTotalAfterDiscount + additionalFees)}
          </PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
