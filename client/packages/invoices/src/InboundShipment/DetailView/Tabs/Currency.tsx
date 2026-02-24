import React from 'react';
import {
  BufferedNumericTextInput,
  DetailContainer,
  InputWithLabelRow,
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
  const currencyRate = data?.currencyRate;

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
              />
            }
          />
        </Stack>
        <Stack
          spacing={2.5}
          sx={{
            flex: 1,
            p: 2.5,
          }}
        >
          {/* {chargeFields.map(({ key, label }) => (
            <InputWithLabelRow
              key={key}
              label={label}
              labelWidth={'150px'}
              Input={
                <CurrencyInput
                  value={
                    (draft?.[key as keyof PurchaseOrderFragment] as number) ??
                    0
                  }
                  onChangeNumber={value =>
                    onChange({
                      [key]: value,
                    } as Partial<PurchaseOrderFragment>)
                  }
                />
              }
            />
          ))} */}
          <InputWithLabelRow
            label={t('label.currency')}
            Input={
              <CurrencyAutocomplete
                currencyId={''}
                onChange={() => {}}
                width={150}
              />
            }
          />
        </Stack>
      </Stack>
    </DetailContainer>
  );
};
