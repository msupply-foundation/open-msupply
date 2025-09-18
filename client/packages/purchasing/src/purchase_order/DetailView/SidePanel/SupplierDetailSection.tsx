import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
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

interface SupplierDetailSectionProps {
  draft?: PurchaseOrderFragment;
  onChange: (input: Partial<PurchaseOrderFragment>) => void;
  disabled: boolean;
}

export const SupplierDetailSection = ({
  draft,
  onChange,
  disabled,
}: SupplierDetailSectionProps): ReactElement => {
  const t = useTranslation();

  const handleSupplierDiscountChange = (value: number | undefined) => {
    if (value == null || value === draft?.supplierDiscountPercentage) return;
    onChange({ supplierDiscountPercentage: value });
  };

  const handleSupplierDiscountAmountChange = (value: number | undefined) => {
    if (value == null || value === draft?.supplierDiscountAmount) return;
    onChange({ supplierDiscountAmount: value });
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
      </Grid>
    </DetailPanelSection>
  );
};
