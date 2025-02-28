import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  useFormatCurrency,
  InfoTooltipIcon,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';

export const PricingSectionComponent = () => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const {
    query: { data: prescriptionData },
  } = usePrescription();
  const pricing = prescriptionData?.pricing;
  if (!pricing) return null;

  return (
    <DetailPanelSection title={t('heading.pricing')}>
      <Grid container gap={0.5}>
        {prescriptionData.insurancePolicy && (
          <>
            <PanelRow>
              <InfoTooltipIcon title={t('messages.insurance-description')} />
              <PanelLabel fontWeight="bold">
                {t('heading.insurance')}
              </PanelLabel>
            </PanelRow>

            <PanelRow sx={{ marginLeft: 1.25 }}>
              <PanelLabel>{t('label.provider-name')}</PanelLabel>
              <PanelField>
                {
                  prescriptionData.insurancePolicy.insuranceProviders
                    ?.providerName
                }
              </PanelField>
            </PanelRow>

            <PanelRow sx={{ marginLeft: 1.25 }}>
              <PanelLabel>{t('label.policy-number')}</PanelLabel>
              <PanelField>
                {prescriptionData.insurancePolicy.policyNumber}
              </PanelField>
            </PanelRow>

            <PanelRow sx={{ marginLeft: 1.25 }}>
              <PanelLabel>{t('label.discount-amount')}</PanelLabel>
              <PanelField>
                {c(prescriptionData.insuranceDiscountAmount ?? 0)}
              </PanelField>
            </PanelRow>

            <PanelRow sx={{ marginLeft: 1.25 }}>
              <PanelLabel>{t('label.discount-percentage')}</PanelLabel>
              <PanelField>
                {prescriptionData.insuranceDiscountPercentage ?? 0}%
              </PanelField>
            </PanelRow>
          </>
        )}

        <PanelRow>
          <PanelLabel fontWeight="bold">{t('heading.grand-total')}</PanelLabel>
          <PanelField>{c(pricing.totalAfterTax)}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
