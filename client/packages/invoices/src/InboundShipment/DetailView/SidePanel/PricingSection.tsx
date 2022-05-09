import React, { memo } from 'react';
import {
  useToggle,
  useCurrency,
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  IconButton,
  EditIcon,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { InboundServiceLineEdit } from '../modals';

export const PricingSectionComponent = () => {
  const t = useTranslation('replenishment');
  const serviceLineModal = useToggle(false);
  const { c } = useCurrency();
  const { pricing } = useInbound.document.fields(['pricing']);

  return (
    <DetailPanelSection title={t('heading.charges')}>
      <Grid container gap={0.5}>
        {serviceLineModal.isOn && (
          <InboundServiceLineEdit
            isOpen={serviceLineModal.isOn}
            onClose={serviceLineModal.toggleOff}
          />
        )}

        <PanelRow>
          <PanelLabel fontWeight="bold">
            {t('heading.stock-charges')}
          </PanelLabel>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.sub-total')}</PanelLabel>
          <PanelField>{c(pricing.stockTotalBeforeTax).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.total')}</PanelLabel>
          <PanelField>{c(pricing.stockTotalAfterTax).format()}</PanelField>
        </PanelRow>
        <PanelRow style={{ marginTop: 12 }}>
          <PanelLabel fontWeight="bold">
            {t('heading.service-charges')}
          </PanelLabel>
          <PanelField>
            <IconButton
              icon={<EditIcon style={{ fontSize: 16, fill: 'none' }} />}
              label={t('label.edit')}
              onClick={serviceLineModal.toggleOn}
            />
          </PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.sub-total')}</PanelLabel>
          <PanelField>{c(pricing.serviceTotalBeforeTax).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.total')}</PanelLabel>
          <PanelField>{c(pricing.serviceTotalAfterTax).format()}</PanelField>
        </PanelRow>
        <PanelRow style={{ marginTop: 12 }}>
          <PanelLabel fontWeight="bold">{t('heading.totals')}</PanelLabel>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.sub-total')}</PanelLabel>
          <PanelField>{c(pricing.totalBeforeTax).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.total')}</PanelLabel>
          <PanelField>{c(pricing.totalAfterTax).format()}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
