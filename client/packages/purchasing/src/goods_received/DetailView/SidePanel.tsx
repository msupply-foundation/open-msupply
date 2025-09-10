import React from 'react';
import {
  useTranslation,
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelRow,
  PanelLabel,
  PanelField,
  DateUtils,
  useBufferState,
  useDebouncedValueCallback,
  BufferedTextArea,
} from '@openmsupply-client/common';
import { DonorSearchInput } from '@openmsupply-client/system/src';
import { useGoodsReceived } from '../api/hooks';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const SidePanel = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const {
    query: { data },
    update: { update },
  } = useGoodsReceived();
  const { comment } = data ?? {};

  const [commentBuffer, setCommentBuffer] = useBufferState(comment ?? '');

  const debouncedUpdate = useDebouncedValueCallback(
    update,
    [commentBuffer],
    1500
  );

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
              donorId={data?.donor?.id ?? null}
              onChange={donor => update({ donor })}
              disabled={isDisabled}
              clearable
            />
          </PanelRow>
        </Grid>
      </DetailPanelSection>

      <DetailPanelSection title={t('heading.comment')}>
        <BufferedTextArea
          fullWidth
          disabled={isDisabled}
          onChange={e => {
            setCommentBuffer(e.target.value);
            debouncedUpdate({ comment: e.target.value });
          }}
          value={commentBuffer}
        />
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
