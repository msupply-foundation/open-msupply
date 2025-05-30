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
  Divider,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { OutboundServiceLineEdit } from '../OutboundServiceLineEdit';
import { CurrencyModal, CurrencyRowFragment } from '@openmsupply-client/system';

type PricingGroupProps = {
  pricing: PricingNode;
  taxPercentage?: number | null;
  isDisabled?: boolean;
};

type CurrencyPricingProps = {
  pricing: PricingNode;
  currency?: CurrencyRowFragment | null;
  otherPartyIsInternal: boolean;
  currencyRate: number;
  onChange: (value: CurrencyRowFragment | null) => void;
};

const ServiceCharges = ({ pricing, isDisabled }: PricingGroupProps) => {
  const serviceLineModal = useToggle(false);
  const t = useTranslation();
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
      {serviceLines
        ? serviceLines.map((line, index) => (
            <PanelRow
              key={index}
              sx={{
                marginLeft: '10px',
                paddingBottom: index === serviceLines.length - 1 ? 2 : 0,
              }}
            >
              <PanelLabel>{line.itemName}</PanelLabel>
              <PanelField>{c(line.totalBeforeTax)}</PanelField>
            </PanelRow>
          ))
        : null}
      {serviceLines?.length !== 0 ? <Divider margin={2} /> : null}

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

const ItemPrices = ({
  pricing,
  isDisabled,
  taxPercentage,
}: PricingGroupProps) => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const { updateInvoiceTax } = useOutbound.document.updateInvoiceTax();

  const { stockTotalBeforeTax, stockTotalAfterTax } = pricing;

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
        <PanelLabel>{`${t('heading.tax')} ${Formatter.tax(
          taxPercentage ?? 0
        )}`}</PanelLabel>
        <PanelField>
          <TaxEdit
            disabled={disableTax}
            tax={taxPercentage ?? 0}
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
  const t = useTranslation();
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
        <PanelField>{currencyRate === 0 ? 1 : currencyRate}</PanelField>
      </PanelRow>
      <PanelRow>
        <PanelLabel>{t('heading.total')}</PanelLabel>
        <PanelField>
          {isHomeCurrency
            ? UNDEFINED_STRING_VALUE
            : foreignCurrency(
                pricing.foreignCurrencyTotalAfterTax ?? 0
              ).format()}
        </PanelField>
      </PanelRow>
    </>
  );
};

export const Totals = ({ pricing }: PricingGroupProps) => {
  const t = useTranslation();
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
  const t = useTranslation();
  const isDisabled = useOutbound.utils.isDisabled();

  const { pricing, taxPercentage, currency, otherParty, update, currencyRate } =
    useOutbound.document.fields([
      'otherParty',
      'taxPercentage',
      'currencyRate',
      'pricing',
      'currency',
    ]);

  return (
    <DetailPanelSection title={t('heading.invoice-details')}>
      <Grid container gap={0.5}>
        <ServiceCharges pricing={pricing} isDisabled={isDisabled} />
        <ItemPrices
          pricing={pricing}
          isDisabled={isDisabled}
          taxPercentage={taxPercentage}
        />
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
