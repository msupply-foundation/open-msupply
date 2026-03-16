import React from 'react';
import {
  BasicTextInput,
  BufferedNumericTextInput,
  DetailContainer,
  InputWithLabelRow,
  NumUtils,
  Stack,
  useTranslation,
} from '@openmsupply-client/common';
import { CurrencyAutocomplete } from '@openmsupply-client/system';
import { useInboundShipment } from '../../api';

export const CurrencyTab = () => {
  const t = useTranslation();
  const {
    query: { data },
    update: { update },
  } = useInboundShipment();
  const purchaseOrder = data?.purchaseOrder;
  const currencyRate = data?.currencyRate ?? 1;
  const pricing = data?.pricing;

  // A = sum of charges on the PO, in PO currency
  const chargesInPoCurrency =
    (purchaseOrder?.agentCommission ?? 0) +
    (purchaseOrder?.documentCharge ?? 0) +
    (purchaseOrder?.communicationsCharge ?? 0) +
    (purchaseOrder?.insuranceCharge ?? 0) +
    (purchaseOrder?.freightCharge ?? 0);

  // A converted to local currency
  const chargesConvertedToLocal =
    currencyRate !== 0 ? chargesInPoCurrency / currencyRate : 0;

  // B = local charges (service charges on the inbound shipment)
  const chargesInLocalCurrency = pricing?.serviceTotalAfterTax ?? 0;

  // Total goods in local currency (stock total)
  const totalGoodsLocal = pricing?.stockTotalAfterTax ?? 0;

  // Total goods in PO currency
  const totalGoodsPoCurrency =
    currencyRate !== 0 ? totalGoodsLocal / currencyRate : 0;

  // Total charges = (A / rate) + B
  const totalCharges = chargesConvertedToLocal + chargesInLocalCurrency;

  // % Cost adjustment = totalCharges / totalGoodsLocal * 100
  const costAdjustmentPercent =
    totalGoodsLocal !== 0 ? (totalCharges / totalGoodsLocal) * 100 : 0;

  const formatValue = (value: number) =>
    NumUtils.round(value, 2).toFixed(2);

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
              <BufferedNumericTextInput
                value={currencyRate}
                onChange={currencyRate => update({ currencyRate })}
                decimalLimit={4}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.charges-in-po-currency')}
            Input={
              <BasicTextInput
                value={formatValue(chargesInPoCurrency)}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.charges-a-converted-to-local')}
            Input={
              <BasicTextInput
                value={formatValue(chargesConvertedToLocal)}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.charges-b-in-local-currency')}
            Input={
              <BasicTextInput
                value={formatValue(chargesInLocalCurrency)}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
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
              <BasicTextInput
                value={formatValue(totalGoodsPoCurrency)}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.total-goods-local-currency')}
            Input={
              <BasicTextInput
                value={formatValue(totalGoodsLocal)}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.total-charges')}
            Input={
              <BasicTextInput
                value={formatValue(totalCharges)}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.cost-percentage-adjustment')}
            Input={
              <BasicTextInput
                value={formatValue(costAdjustmentPercent) + '%'}
                disabled
                textAlign="right"
                sx={{ width: 150 }}
              />
            }
          />
        </Stack>
      </Stack>
    </DetailContainer>
  );
};
