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

export const PricingSectionComponent = () => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const { pricing } = usePrescription.document.fields('pricing');

  return (
    <DetailPanelSection title={t('heading.dispensary-details')}>
      <Grid container gap={0.5}>
        <>
          <PanelRow style={{ marginTop: 12 }}>
            <PanelLabel fontWeight="bold">
              {t('heading.grand-total')}
            </PanelLabel>
            <PanelField>{c(pricing.totalAfterTax)}</PanelField>
          </PanelRow>
        </>
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
