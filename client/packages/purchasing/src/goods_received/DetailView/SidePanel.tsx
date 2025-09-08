import React, { ReactElement } from 'react';
import {
  useTranslation,
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelRow,
  PanelLabel,
  PanelField,
  DateUtils,
  TextArea,
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
      <DetailPanelSection title={t('heading.details')}>
        <Grid container gap={1} key="goods-received-details">
          <PanelRow>
            <PanelLabel>{t('label.goods-received-number')}</PanelLabel>
            <PanelField>{data?.number ?? ''}</PanelField>
          </PanelRow>

          <PanelRow>
            <PanelLabel>{t('label.purchase-order-number')}</PanelLabel>
            <PanelField>{data?.purchaseOrderNumber ?? ''}</PanelField>
          </PanelRow>
        </Grid>
      </DetailPanelSection>

      <DetailPanelSection title={t('heading.additional-info')}>
        <Grid container gap={1} key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.created-by')}</PanelLabel>
            <PanelField>{data?.user?.username ?? ''}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.created-datetime')}</PanelLabel>
            <PanelField>
              {data?.createdDatetime
                ? DateUtils.getDateOrNull(
                    data.createdDatetime
                  )?.toLocaleDateString()
                : ''}
            </PanelField>
          </PanelRow>

          <PanelRow
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: theme => theme.palette.background.white,
                fontSize: '12px',
                borderRadius: '4px',
              },
            }}
          >
            <PanelLabel>{t('label.donor')}</PanelLabel>
            <DonorSearchInput
              donorId={''}
              onChange={donor =>
                console.info('TODO: Handle donor change', donor)
              }
            />
          </PanelRow>
        </Grid>
      </DetailPanelSection>

      <DetailPanelSection title={t('heading.comment')}>
        <TextArea
          fullWidth
          value={data?.comment ?? ''}
          onChange={e =>
            console.info('TODO: Handle comment change', e.target.value)
          }
          sx={{
            '& .MuiInputBase-root': {
              backgroundColor: theme => theme.palette.background.white,
              fontSize: '12px',
              borderRadius: '4px',
              minHeight: '80px',
            },
          }}
        />
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
