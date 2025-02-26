import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  useFormatCurrency,
} from '@openmsupply-client/common';
import { useInsurance, usePrescription } from '../../api';
import { usePrescriptionGraphQL } from '../../api/usePrescriptionGraphQL';

export const PricingSectionComponent = () => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const {
    query: { data: prescriptionData}
  } = usePrescription();
  const pricing = prescriptionData?.pricing;
  if (!pricing) return null;

  const insuranceId = prescriptionData.nameInsuranceJoinId;
  const { storeId } = usePrescriptionGraphQL()
  const {
    query: {data: insuranceData}
   } = useInsurance(insuranceId, storeId);

  return (
    <DetailPanelSection title={t('heading.pricing')}>
      <Grid container gap={0.5}>
        
        {insuranceData && (
        <>
        <PanelRow>
          <PanelLabel>{t('label.insurance-provider-name')}</PanelLabel>
          <PanelField>
            {insuranceData.insuranceProviders?.providerName}
          </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.insurance-policy-number')}</PanelLabel>
          <PanelField>
            {insuranceData.policyNumber}
          </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.insurance-discount-amount')}</PanelLabel>
          <PanelField>
            {c(prescriptionData.insuranceDiscountAmount ?? 0)}
          </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.insurance-discount-percentage')}</PanelLabel>
          <PanelField>{insuranceData.discountPercentage}% </PanelField>
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
