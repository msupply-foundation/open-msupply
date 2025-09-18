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
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface PricingSectionProps {
  draft?: PurchaseOrderFragment;
}

export const PricingSection = ({ draft }: PricingSectionProps) => {
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
          <PanelLabel>{t('label.cost-final')}</PanelLabel>
          <PanelField>
            {c(draft.orderTotalAfterDiscount + additionalFees)}
          </PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
