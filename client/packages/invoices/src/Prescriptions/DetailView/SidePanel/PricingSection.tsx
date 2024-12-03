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
import { usePrescriptionSingle } from '../../api';

export const PricingSectionComponent = () => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const {
    query: { data },
  } = usePrescriptionSingle();

  const pricing = data?.pricing;

  if (!pricing) return null;

  return (
    <DetailPanelSection title={t('heading.dispensary-details')}>
      <Grid container gap={0.5}>
        <>
          <PanelRow style={{ marginTop: 12 }}>
            <PanelLabel fontWeight="bold">
              {t('heading.grand-total')}
            </PanelLabel>
            <PanelField>{c(pricing?.totalAfterTax)}</PanelField>
          </PanelRow>
        </>
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
