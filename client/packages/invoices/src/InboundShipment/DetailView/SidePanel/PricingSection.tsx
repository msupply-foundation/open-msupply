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
  Formatter,
  PricingUtils,
  InvoiceLineNodeType,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { InboundServiceLineEdit, TaxEdit } from '../modals';

export const PricingSectionComponent = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useInbound.utils.isDisabled();
  const serviceLineModal = useToggle(false);
  const { c } = useCurrency();

  const { pricing, lines, taxPercentage, update } = useInbound.document.fields([
    'pricing',
    'lines',
    'taxPercentage',
  ]);
  const { data: serviceLines } = useInbound.lines.serviceLines();
  const { mutateAsync: updateTax } = useInbound.document.updateTax();

  const tax = PricingUtils.effectiveTax(
    pricing?.serviceTotalBeforeTax,
    pricing?.serviceTotalAfterTax
  );

  const totalTax = PricingUtils.taxAmount(
    pricing?.serviceTotalBeforeTax,
    pricing?.serviceTotalAfterTax
  );

  const disableServiceTax =
    serviceLines
      ?.map(line => line.totalBeforeTax)
      .reduce((a, b) => a + b, 0) === 0;
  const disableStockTax = pricing?.stockTotalBeforeTax === 0 || isDisabled;

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
          <PanelLabel>{`${t('heading.tax')} ${Formatter.tax(
            taxPercentage ?? 0
          )}`}</PanelLabel>
          <PanelField>
            <TaxEdit
              disabled={disableStockTax || isDisabled}
              tax={taxPercentage ?? 0}
              onChange={taxPercentage => {
                update({ taxPercentage });
              }}
            />
          </PanelField>
          <PanelField>{c(taxPercentage ?? 0).format()}</PanelField>
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
          <PanelLabel>{`${t('heading.tax')} ${Formatter.tax(tax)}`}</PanelLabel>
          <PanelField>
            <TaxEdit
              disabled={disableServiceTax || isDisabled}
              tax={tax}
              onChange={taxPercentage => {
                updateTax({
                  lines: lines.nodes,
                  taxPercentage,
                  type: InvoiceLineNodeType.Service,
                });
              }}
            />
          </PanelField>
          <PanelField>{c(totalTax).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.total')}</PanelLabel>
          <PanelField>{c(pricing.serviceTotalAfterTax).format()}</PanelField>
        </PanelRow>
        <PanelRow style={{ marginTop: 12 }}>
          <PanelLabel fontWeight="bold">{t('heading.grand-total')}</PanelLabel>
          <PanelField>{c(pricing.totalAfterTax).format()}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
