import React, { memo } from 'react';
import {
  formatTax,
  Tooltip,
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  useToggle,
  IconButton,
  useFormatCurrency,
  PricingNode,
  NumUtils,
  InfoIcon,
  MenuDotsIcon,
} from '@openmsupply-client/common';
import { useOutboundFields } from '../../api';
import { OutboundServiceLineEdit } from '../OutboundServiceLineEdit';
import { TaxEdit } from '../modals';

type PricingGroupProps = {
  pricing: PricingNode;
};

const InfoTooltip = ({ title }: { title: string }) => (
  <Tooltip title={title}>
    <div style={{ transform: 'scale(0.7)' }}>
      <InfoIcon fontSize="small" />
    </div>
  </Tooltip>
);

const ServiceCharges = ({ pricing }: PricingGroupProps) => {
  const serviceLineModal = useToggle(false);
  const t = useTranslation('distribution');
  const c = useFormatCurrency();

  const { serviceTotalBeforeTax, serviceTotalAfterTax } = pricing;

  const tax = NumUtils.effectiveTax(
    serviceTotalBeforeTax,
    serviceTotalAfterTax
  );
  const totalTax = NumUtils.taxAmount(
    serviceTotalBeforeTax,
    serviceTotalAfterTax
  );

  return (
    <>
      {serviceLineModal.isOn && (
        <OutboundServiceLineEdit
          isOpen={serviceLineModal.isOn}
          onClose={serviceLineModal.toggleOff}
        />
      )}
      <PanelRow>
        <InfoTooltip title={t('messages.service-charges-description')} />
        <PanelLabel fontWeight="bold">
          {t('heading.service-charges')}
        </PanelLabel>
        <PanelField>
          <IconButton
            icon={<MenuDotsIcon style={{ fontSize: 16 }} />}
            label={t('messages.edit-service-charges')}
            onClick={serviceLineModal.toggleOn}
          />
        </PanelField>
      </PanelRow>

      <PanelRow>
        <PanelLabel>{t('heading.sub-total')}</PanelLabel>
        <PanelField>{c(serviceTotalBeforeTax)}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{`${t('heading.tax')} ${formatTax(tax)}`}</PanelLabel>
        <PanelField>
          <TaxEdit tax={tax} />
        </PanelField>
        <PanelField>{c(totalTax)}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>{c(serviceTotalAfterTax)}</PanelField>
      </PanelRow>
    </>
  );
};

const ItemPrices = ({ pricing }: PricingGroupProps) => {
  const t = useTranslation('distribution');
  const c = useFormatCurrency();

  const { stockTotalBeforeTax, stockTotalAfterTax } = pricing;

  const tax = NumUtils.effectiveTax(stockTotalBeforeTax, stockTotalAfterTax);
  const totalTax = NumUtils.taxAmount(stockTotalBeforeTax, stockTotalAfterTax);

  return (
    <>
      <PanelRow>
        <InfoTooltip title={t('messages.stock-charges-description')} />
        <PanelLabel fontWeight="bold">{t('heading.stock-charges')}</PanelLabel>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.sub-total')}</PanelLabel>
        <PanelField>{c(stockTotalBeforeTax)}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{`${t('heading.tax')} ${formatTax(tax)}`}</PanelLabel>
        <PanelField>
          <TaxEdit tax={tax} />
        </PanelField>
        <PanelField>{c(totalTax)}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>{c(stockTotalAfterTax)}</PanelField>
      </PanelRow>
    </>
  );
};

export const Totals = ({ pricing }: PricingGroupProps) => {
  const t = useTranslation('distribution');
  const c = useFormatCurrency();

  const { totalBeforeTax, totalAfterTax } = pricing;

  return (
    <>
      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('heading.totals')}</PanelLabel>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.sub-total')}</PanelLabel>
        <PanelField>{c(totalBeforeTax)}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>{c(totalAfterTax)}</PanelField>
      </PanelRow>
    </>
  );
};

export const PricingSectionComponent = () => {
  const t = useTranslation('distribution');

  const { pricing } = useOutboundFields('pricing');

  return (
    <DetailPanelSection title={t('heading.charges')}>
      <Grid container gap={0.5}>
        <ServiceCharges pricing={pricing} />
        <ItemPrices pricing={pricing} />
        <Totals pricing={pricing} />
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
