import React from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  useFormatCurrency,
  PanelField,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface PricingSectionProps {
  draft: PurchaseOrderFragment;
}

export const PricingSection = ({ draft }: PricingSectionProps) => {
  const t = useTranslation();
  const c = useFormatCurrency();

  if (!draft) return null;

  return (
    <DetailPanelSection title={t('title.pricing')}>
      <Grid container gap={1} key="pricing-section">
        <PanelRow>
          <PanelLabel>{t('report.line-total-cost')}</PanelLabel>
          <PanelField>{c(draft.lineTotalAfterDiscount)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.cost-total-after-discount')}</PanelLabel>
          <PanelField>{c(draft.orderTotalAfterDiscount)}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
