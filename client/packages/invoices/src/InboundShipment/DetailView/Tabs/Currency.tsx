import React from 'react';
import {
  Box,
  BufferedNumericTextInput,
  Currencies,
  CurrencyTextDisplay,
  DetailContainer,
  InfoTooltipIcon,
  InputWithLabelRow,
  NumUtils,
  Stack,
  Typography,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';
import { CurrencyAutocomplete } from '@openmsupply-client/system';
import { useInboundShipment } from '../../api';
import { calculateCurrencyValues } from './CurrencyCalculations';

export const CurrencyTab = () => {
  const t = useTranslation();
  const {
    query: { data },
    update: { update },
  } = useInboundShipment();
  const purchaseOrder = data?.purchaseOrder;
  const currencyRate = data?.currencyRate ?? 1;
  const pricing = data?.pricing;
  const poCurrencyCode = purchaseOrder?.currency?.code as
    | Currencies
    | undefined;
  const { store } = useAuthContext();
  const isHomeCurrency = store?.homeCurrencyCode === poCurrencyCode;

  // A = sum of charges on the PO, in PO currency
  const chargesInPoCurrency =
    (purchaseOrder?.agentCommission ?? 0) +
    (purchaseOrder?.documentCharge ?? 0) +
    (purchaseOrder?.communicationsCharge ?? 0) +
    (purchaseOrder?.insuranceCharge ?? 0) +
    (purchaseOrder?.freightCharge ?? 0);

  // B = local charges (service charges on the inbound shipment)
  const chargesInLocalCurrency = pricing?.serviceTotalAfterTax ?? 0;

  // Total goods in PO currency (from PO, not affected by rate changes)
  const totalGoodsPoCurrency = purchaseOrder?.orderTotalAfterDiscount ?? 0;

  const {
    chargesConvertedToLocal,
    totalGoodsLocal,
    totalCharges,
    costAdjustmentPercent,
  } = calculateCurrencyValues({
    currencyRate,
    chargesInForeignCurrency: chargesInPoCurrency,
    chargesInLocalCurrency,
    totalGoodsForeignCurrency: totalGoodsPoCurrency,
  });

  return (
    <DetailContainer>
      <Stack direction="row" spacing={3}>
        <Stack
          spacing={3}
          sx={{
            flex: 1,
            p: 2.5,
          }}
        >
          <InputWithLabelRow
            label={t('label.po-currency')}
            Input={
              <CurrencyAutocomplete
                currencyId={purchaseOrder?.currency?.id}
                onChange={() => {}}
                width={150}
                disabled
              />
            }
          />
          <InputWithLabelRow
            label={t('label.currency-rate')}
            Input={
              <>
                <BufferedNumericTextInput
                  value={isHomeCurrency ? 1 : currencyRate}
                  onChange={currencyRate => update({ currencyRate })}
                  decimalLimit={4}
                  disabled={isHomeCurrency}
                  width={150}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                  <InfoTooltipIcon
                    iconSx={{ color: 'gray.main' }}
                    title={t('messages.currency-rate-info')}
                  />
                </Box>
              </>
            }
          />
          <InputWithLabelRow
            label={t('label.charges-in-po-currency')}
            Input={
              <CurrencyTextDisplay
                value={chargesInPoCurrency}
                currencyCode={poCurrencyCode}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.charges-a-converted-to-local')}
            Input={<CurrencyTextDisplay value={chargesConvertedToLocal} />}
          />
          <InputWithLabelRow
            label={t('label.charges-b-in-local-currency')}
            Input={<CurrencyTextDisplay value={chargesInLocalCurrency} />}
          />
        </Stack>
        <Stack
          spacing={3}
          sx={{
            flex: 1,
            p: 2.5,
          }}
        >
          <InputWithLabelRow
            label={t('label.total-goods-po-currency')}
            Input={
              <CurrencyTextDisplay
                value={totalGoodsPoCurrency}
                currencyCode={poCurrencyCode}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.total-goods-local-currency')}
            Input={<CurrencyTextDisplay value={totalGoodsLocal} />}
          />
          <InputWithLabelRow
            label={t('label.total-charges')}
            Input={<CurrencyTextDisplay value={totalCharges} />}
          />
          <InputWithLabelRow
            label={t('label.cost-percentage-adjustment')}
            Input={
              <Typography
                sx={{
                  minWidth: 150,
                  textAlign: 'right',
                  fontSize: 'inherit',
                  paddingX: '8px',
                  paddingY: '4px',
                }}
              >
                {`${NumUtils.round(costAdjustmentPercent, 2).toFixed(2)}%`}
              </Typography>
            }
          />
        </Stack>
      </Stack>
    </DetailContainer>
  );
};
