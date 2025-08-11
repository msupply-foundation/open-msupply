import React, { ReactElement } from 'react';
import {
  useTranslation,
  DetailPanelPortal,
  Grid,
  PanelRow,
  PanelLabel,
  NumericTextInput,
  DateTimePickerInput,
  DateUtils,
  TextArea,
  BasicTextInput,
} from '@openmsupply-client/common';
import { DonorSearchInput } from '@openmsupply-client/system/src';
import { useGoodsReceived } from '../api/hooks';

export const SidePanel = (): ReactElement => {
  const t = useTranslation();
  const {
    query: { data },
  } = useGoodsReceived();

  return (
    <DetailPanelPortal>
      <Grid
        container
        gap={4}
        key="goods-received-side-panel"
        sx={{
          padding: 2,
        }}
      >
        <PanelRow>
          <PanelLabel>{t('label.goods-received-number')}</PanelLabel>
          <NumericTextInput value={data?.number} disabled />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.purchase-order-number')}</PanelLabel>
          <NumericTextInput value={data?.purchaseOrderNumber ?? 0} disabled />
        </PanelRow>

        {/* TODO: Extend backend to have loader for inbound shipment? */}
        <PanelRow>
          <PanelLabel>{t('label.inbound-shipment')}</PanelLabel>
          <BasicTextInput value={'Inbound Shipment ID'} disabled />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.status')}</PanelLabel>
          <NumericTextInput value={data?.number} disabled />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.created-by')}</PanelLabel>
          <NumericTextInput value={data?.number} disabled />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.created-datetime')}</PanelLabel>
          <DateTimePickerInput
            disabled
            value={DateUtils.getDateOrNull(data?.createdDatetime)}
            format="P"
            onChange={() => {}}
            textFieldSx={{
              backgroundColor: 'white',
            }}
            actions={['cancel']}
          />
        </PanelRow>

        <PanelRow
          sx={{
            '.MuiInputBase-root': {
              backgroundColor: 'white',
            },
          }}
        >
          {/* TODO: Extend backend to have loader for donor*/}
          <PanelLabel>{t('label.donor')}</PanelLabel>
          <DonorSearchInput
            donorId={''}
            onChange={donor => console.info('TODO: Handle donor change', donor)}
          />
        </PanelRow>

        <PanelLabel>{t('label.comment')}</PanelLabel>
        <TextArea
          fullWidth
          value={data?.comment ?? ''}
          onChange={e =>
            console.info('TODO: Handle comment change', e.target.value)
          }
        />
      </Grid>
    </DetailPanelPortal>
  );
};
