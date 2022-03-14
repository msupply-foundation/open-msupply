import React, { FC } from 'react';
import {
  useToggle,
  useCurrency,
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  BufferedTextArea,
  useNotification,
  useTranslation,
  ColorSelectButton,
  useBufferState,
  IconButton,
  EditIcon,
  Tooltip,
  Link,
  useFormatDate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useInboundFields, useInbound, useIsInboundDisabled } from '../api';
import { InboundServiceLineEdit } from './modals';

const AdditionalInfoSection: FC = () => {
  const { comment, colour, update } = useInboundFields(['comment', 'colour']);
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation(['common', 'replenishment']);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={({ hex }) => {
                setBufferedColor(hex);
                update({ colour: hex });
              }}
              color={bufferedColor}
            />
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

const RelatedDocumentsRow: FC<{
  label: string;
  to: string;
  value?: number | null;
}> = ({ label, to, value }) => (
  <PanelRow>
    <PanelLabel>{label}</PanelLabel>
    <PanelField>
      <Link to={to}>{`#${value}`}</Link>
    </PanelField>
  </PanelRow>
);

const RelatedDocumentsSection: FC = () => {
  const t = useTranslation('replenishment');
  const d = useFormatDate();
  const { requisition } = useInboundFields('requisition');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.internal-order-created-on', {
      date: d(new Date(createdDatetime)),
    });

    if (username && username !== 'unknown') {
      tooltip += ` ${t('messages.by-user', { username })}`;
    }

    return tooltip;
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item direction="column" gap={0.5}>
        {requisition ? (
          <Tooltip
            key={requisition?.id}
            title={getTooltip(
              requisition.createdDatetime,
              requisition.user?.username
            )}
          >
            <Grid item>
              <RelatedDocumentsRow
                label={t('label.requisition')}
                value={requisition.requisitionNumber}
                to={RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InternalOrder)
                  .addPart(String(requisition.requisitionNumber))
                  .build()}
              />
            </Grid>
          </Tooltip>
        ) : (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        )}
      </Grid>
    </DetailPanelSection>
  );
};

export const PricingSection = () => {
  const t = useTranslation('replenishment');
  const serviceLineModal = useToggle(false);
  const { c } = useCurrency();
  const { pricing } = useInboundFields(['pricing']);

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
          <PanelLabel>{t('heading.total')}</PanelLabel>
          <PanelField>{c(pricing.serviceTotalAfterTax).format()}</PanelField>
        </PanelRow>
        <PanelRow style={{ marginTop: 12 }}>
          <PanelLabel fontWeight="bold">{t('heading.totals')}</PanelLabel>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.sub-total')}</PanelLabel>
          <PanelField>{c(pricing.totalBeforeTax).format()}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.total')}</PanelLabel>
          <PanelField>{c(pricing.totalAfterTax).format()}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const { data } = useInbound();
  const { success } = useNotification();
  const t = useTranslation('common');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  return (
    <DetailPanelPortal
      Actions={
        <>
          <DetailPanelAction
            icon={<CopyIcon />}
            title={t('link.copy-to-clipboard')}
            onClick={copyToClipboard}
          />
        </>
      }
    >
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
      <PricingSection />
    </DetailPanelPortal>
  );
};
