import React from 'react';
import {
  Box,
  BufferedNumericTextInput,
  InlineSpinner,
  Currencies,
  CurrencyInput,
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
    draft,
    updatePatch,
    update: { saveDraft, isUpdating },
  } = useInboundShipment();
  const purchaseOrder = draft?.purchaseOrder;
  const currencyRate = draft?.currencyRate ?? 1;
  const poCurrencyCode = purchaseOrder?.currency?.code as
    | Currencies
    | undefined;
  const { store } = useAuthContext();
  const isHomeCurrency = store?.homeCurrencyCode === poCurrencyCode;

  // A = charges in foreign (PO) currency, stored on the invoice
  const chargesInForeignCurrency = draft?.chargesForeignCurrency ?? 0;

  // B = charges in local currency, stored on the invoice
  const chargesInLocalCurrency = draft?.chargesLocalCurrency ?? 0;

  // Total goods in PO currency (from PO)
  const totalGoodsPoCurrency = purchaseOrder?.orderTotalAfterDiscount ?? 0;

  const {
    chargesConvertedToLocal,
    totalGoodsLocal,
    totalCharges,
    costAdjustmentPercent,
  } = calculateCurrencyValues({
    currencyRate,
    chargesInForeignCurrency,
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
              <Box
                onBlur={saveDraft}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <BufferedNumericTextInput
                  value={isHomeCurrency ? 1 : currencyRate}
                  onChange={currencyRate =>
                    updatePatch({ currencyRate: currencyRate ?? undefined })
                  }
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
              </Box>
            }
          />
          <InputWithLabelRow
            label={t('label.charges-in-po-currency')}
            Input={
              <Box onBlur={saveDraft}>
                <CurrencyInput
                  value={chargesInForeignCurrency}
                  onChangeNumber={chargesForeignCurrency =>
                    updatePatch({ chargesForeignCurrency })
                  }
                  width={150}
                />
              </Box>
            }
          />
          <InputWithLabelRow
            label={t('label.charges-a-converted-to-local')}
            Input={<CurrencyTextDisplay value={chargesConvertedToLocal} />}
          />
          <InputWithLabelRow
            label={t('label.charges-b-in-local-currency')}
            Input={
              <Box onBlur={saveDraft}>
                <CurrencyInput
                  value={chargesInLocalCurrency}
                  onChangeNumber={chargesLocalCurrency =>
                    updatePatch({ chargesLocalCurrency })
                  }
                  width={150}
                />
              </Box>
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
          {isUpdating && <InlineSpinner messageKey="saving" />}
        </Stack>
      </Stack>
    </DetailContainer>
  );
};
