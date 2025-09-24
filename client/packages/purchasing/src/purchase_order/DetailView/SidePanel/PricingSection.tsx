import React from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  PanelField,
  splitTranslatedLines,
  useCurrency,
  Currencies,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';

interface PricingSectionProps {
  draft?: PurchaseOrderFragment;
}

export const PricingSection = ({ draft }: PricingSectionProps) => {
  const t = useTranslation();
  const { c } = useCurrency(draft?.currency?.code as Currencies);

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
          <PanelField>{c(draft.lineTotalAfterDiscount).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.cost-total-after-discount')}</PanelLabel>
          <PanelField>{c(draft.orderTotalAfterDiscount).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>
            {splitTranslatedLines(t('label.cost-additional-fees'))}
          </PanelLabel>
          <PanelField>{c(additionalFees).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.cost-final')}</PanelLabel>
          <PanelField>
            {c(draft.orderTotalAfterDiscount + additionalFees).format()}
          </PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
