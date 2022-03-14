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
import {
  useOutboundFields,
  useUpdateOutboundTax,
  useOutboundServiceLines,
  useOutboundLines,
  useIsOutboundDisabled,
} from '../../api';
import { OutboundServiceLineEdit } from '../OutboundServiceLineEdit';
import { TaxEdit } from '../modals';

type PricingGroupProps = {
  pricing: PricingNode;
  isDisabled?: boolean;
};

const InfoTooltip = ({ title }: { title: string }) => (
  <Tooltip title={title}>
    <div style={{ transform: 'scale(0.7)', cursor: 'help' }}>
      <InfoIcon fontSize="small" />
    </div>
  </Tooltip>
);

const ServiceCharges = ({ pricing, isDisabled }: PricingGroupProps) => {
  const serviceLineModal = useToggle(false);
  const t = useTranslation('distribution');
  const c = useFormatCurrency();
  const { data: serviceLines } = useOutboundServiceLines();
  const { serviceTotalBeforeTax, serviceTotalAfterTax } = pricing;

  const tax = NumUtils.effectiveTax(
    serviceTotalBeforeTax,
    serviceTotalAfterTax
  );
  const totalTax = NumUtils.taxAmount(
    serviceTotalBeforeTax,
    serviceTotalAfterTax
  );

  const { updateServiceLineTax } = useUpdateOutboundTax();

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
            disabled={isDisabled}
            icon={<MenuDotsIcon style={{ fontSize: 16 }} />}
            label={t('messages.edit-service-charges')}
            onClick={serviceLineModal.toggleOn}
          />
        </PanelField>
      </PanelRow>

      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{t('heading.sub-total')}</PanelLabel>
        <PanelField>{c(serviceTotalBeforeTax)}</PanelField>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{`${t('heading.tax')} ${formatTax(tax)}`}</PanelLabel>
        <PanelField>
          <TaxEdit
            disabled={!serviceLines?.length || isDisabled}
            tax={tax}
            update={updateServiceLineTax}
          />
        </PanelField>
        <PanelField>{c(totalTax)}</PanelField>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>{c(serviceTotalAfterTax)}</PanelField>
      </PanelRow>
    </>
  );
};

const ItemPrices = ({ pricing, isDisabled }: PricingGroupProps) => {
  const t = useTranslation('distribution');
  const c = useFormatCurrency();

  const { data: outboundLines } = useOutboundLines();

  const { stockTotalBeforeTax, stockTotalAfterTax } = pricing;

  const tax = NumUtils.effectiveTax(stockTotalBeforeTax, stockTotalAfterTax);
  const totalTax = NumUtils.taxAmount(stockTotalBeforeTax, stockTotalAfterTax);

  const { updateStockLineTax } = useUpdateOutboundTax();

  return (
    <>
      <PanelRow>
        <InfoTooltip title={t('messages.stock-charges-description')} />
        <PanelLabel fontWeight="bold">
          {t('heading.item-sell-price')}
        </PanelLabel>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{t('heading.sub-total')}</PanelLabel>
        <PanelField>{c(stockTotalBeforeTax)}</PanelField>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{`${t('heading.tax')} ${formatTax(tax)}`}</PanelLabel>
        <PanelField>
          <TaxEdit
            disabled={!outboundLines?.length || isDisabled}
            tax={tax}
            update={updateStockLineTax}
          />
        </PanelField>
        <PanelField>{c(totalTax)}</PanelField>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>{c(stockTotalAfterTax)}</PanelField>
      </PanelRow>
    </>
  );
};

export const Totals = ({ pricing }: PricingGroupProps) => {
  const t = useTranslation('distribution');
  const c = useFormatCurrency();

  const { totalAfterTax } = pricing;

  return (
    <>
      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('heading.grand-total')}</PanelLabel>
        <PanelField>{c(totalAfterTax)}</PanelField>
      </PanelRow>
    </>
  );
};

export const PricingSectionComponent = () => {
  const t = useTranslation('distribution');
  const isDisabled = useIsOutboundDisabled();

  const { pricing } = useOutboundFields('pricing');

  return (
    <DetailPanelSection title={t('heading.invoice-details')}>
      <Grid container gap={0.5}>
        <ServiceCharges pricing={pricing} isDisabled={isDisabled} />
        <ItemPrices pricing={pricing} isDisabled={isDisabled} />
        <Totals pricing={pricing} />
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
