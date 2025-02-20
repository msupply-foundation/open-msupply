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
import { usePrescription } from '../../api';
// import { useInsurance, usePrescription } from '../../api';
// import { usePrescriptionGraphQL } from '../../api/usePrescriptionGraphQL';

export const PricingSectionComponent = () => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const prescriptionData = usePrescription().query.data;
  const pricing = prescriptionData?.pricing;
  if (!pricing) return null;

  // const insuranceId = prescriptionData?.nameInsuranceJoinId; // TODO add nameInsuranceJoinId to prescriptionData - John said it is not being saved yet, who is doing that work?
  // const { storeId } = usePrescriptionGraphQL();
  // const insuranceData = useInsurance(insuranceId, storeId);

  return (
    <DetailPanelSection title={t('heading.pricing')}>
      <Grid container gap={0.5}>
        {/* if {insuranceData && insuranceData.isActive && insuranceData.insuranceProvider.isActive}

        <PanelRow>
          <PanelLabel>{t('label.insurance-provider-name')}</PanelLabel>
          <PanelField>
            {insuranceData && insuranceData[0]?.insuranceProviders?.providerName}
          </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.percent-discount')}</PanelLabel>
          <PanelField>{insuranceData[0]?.discountPercentage}% </PanelField>
        </PanelRow>

        } */}

        <PanelRow>
          <PanelLabel fontWeight="bold">{t('heading.grand-total')}</PanelLabel>
          <PanelField>{c(pricing.totalAfterTax)}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
