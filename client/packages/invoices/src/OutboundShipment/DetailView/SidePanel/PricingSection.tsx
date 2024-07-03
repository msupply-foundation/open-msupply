import React, { memo } from 'react';
import {
  Formatter,
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
  PricingUtils,
  MenuDotsIcon,
  InfoTooltipIcon,
  useAuthContext,
  useCurrency,
  Currencies,
  UNDEFINED_STRING_VALUE,
  TaxEdit,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { OutboundServiceLineEdit } from '../OutboundServiceLineEdit';
import { CurrencyModal, CurrencyRowFragment } from '@openmsupply-client/system';

type PricingGroupProps = {
  pricing: PricingNode;
  isDisabled?: boolean;
};

type CurrencyPricingProps = {
  pricing: PricingNode;
  currency?: CurrencyRowFragment | null;
  otherPartyIsInternal: boolean;
  currencyRate?: number | null;
  onChange: (value: CurrencyRowFragment | null) => void;
};

const ServiceCharges = ({ pricing, isDisabled }: PricingGroupProps) => {
  const serviceLineModal = useToggle(false);
  const t = useTranslation('distribution');
  const c = useFormatCurrency();
  const { data: serviceLines } = useOutbound.line.serviceLines();
  const { serviceTotalBeforeTax, serviceTotalAfterTax } = pricing;

  const tax = PricingUtils.effectiveTax(
    serviceTotalBeforeTax,
    serviceTotalAfterTax
  );
  const totalTax = PricingUtils.taxAmount(
    serviceTotalBeforeTax,
    serviceTotalAfterTax
  );

  const { updateServiceLineTax } = useOutbound.document.updateTax();
  const disableServiceTax =
    serviceLines
      ?.map(line => line.totalBeforeTax)
      .reduce((a, b) => a + b, 0) === 0;

  return (
    <>
      {serviceLineModal.isOn && (
        <OutboundServiceLineEdit
          isOpen={serviceLineModal.isOn}
          onClose={serviceLineModal.toggleOff}
        />
      )}
      <PanelRow>
        <InfoTooltipIcon title={t('messages.service-charges-description')} />
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
        <PanelLabel>{`${t('heading.tax')} ${Formatter.tax(tax)}`}</PanelLabel>
        <PanelField>
          <TaxEdit
            disabled={disableServiceTax || isDisabled}
            tax={tax}
            onChange={updateServiceLineTax}
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

  const { updateInvoiceTax } = useOutbound.document.updateInvoiceTax();

  const { stockTotalBeforeTax, stockTotalAfterTax } = pricing;

  const tax = PricingUtils.effectiveTax(
    stockTotalBeforeTax,
    stockTotalAfterTax
  );
  const totalTax = PricingUtils.taxAmount(
    stockTotalBeforeTax,
    stockTotalAfterTax
  );
  const disableTax = stockTotalAfterTax === 0 || isDisabled;

  return (
    <>
      <PanelRow>
        <InfoTooltipIcon title={t('messages.stock-charges-description')} />
        <PanelLabel fontWeight="bold">
          {t('heading.item-sell-price')}
        </PanelLabel>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{t('heading.sub-total')}</PanelLabel>
        <PanelField>{c(stockTotalBeforeTax)}</PanelField>
      </PanelRow>
      <PanelRow sx={{ marginLeft: '10px' }}>
        <PanelLabel>{`${t('heading.tax')} ${Formatter.tax(tax)}`}</PanelLabel>
        <PanelField>
          <TaxEdit
            disabled={disableTax}
            tax={tax}
            onChange={updateInvoiceTax}
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

export const ForeignCurrencyPrices = ({
  pricing,
  currency,
  otherPartyIsInternal,
  currencyRate,
  onChange,
}: CurrencyPricingProps) => {
  const t = useTranslation('distribution');
  const { store } = useAuthContext();
  const { c: foreignCurrency } = useCurrency(currency?.code as Currencies);
  const isHomeCurrency = store?.homeCurrencyCode === currency?.code;

  return (
    <>
      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">
          {t('heading.foreign-currency')}
        </PanelLabel>
        <PanelField>
          <CurrencyModal
            onChange={onChange}
            isDisabled={
              otherPartyIsInternal || !store?.preferences.issueInForeignCurrency
            }
            currency={currency as CurrencyRowFragment}
            currencyRate={currencyRate ?? 1}
          />
        </PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('label.code')}</PanelLabel>
        <PanelField>{currency?.code ?? ''}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.rate')}</PanelLabel>
        <PanelField>{currencyRate ?? 1}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>
          {isHomeCurrency
            ? UNDEFINED_STRING_VALUE
            : foreignCurrency(
                pricing.foreignCurrencyTotalAfterTax ?? 0
              ).format()}{' '}
        </PanelField>
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
  const isDisabled = useOutbound.utils.isDisabled();

  const { pricing, currency, otherParty, update, currencyRate } =
    useOutbound.document.fields([
      'otherParty',
      'currencyRate',
      'pricing',
      'currency',
    ]);

  return (
    <DetailPanelSection title={t('heading.invoice-details')}>
      <Grid container gap={0.5}>
        <ServiceCharges pricing={pricing} isDisabled={isDisabled} />
        <ItemPrices pricing={pricing} isDisabled={isDisabled} />
        <Totals pricing={pricing} />
        <ForeignCurrencyPrices
          pricing={pricing}
          currency={currency}
          otherPartyIsInternal={!!otherParty?.store}
          currencyRate={currencyRate}
          onChange={value => {
            update({
              currency: value ?? undefined,
            });
          }}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = memo(PricingSectionComponent);
