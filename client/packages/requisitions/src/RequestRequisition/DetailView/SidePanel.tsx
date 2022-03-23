import React, { FC } from 'react';
import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  BufferedTextArea,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  ColorSelectButton,
  useBufferState,
  Tooltip,
  Link,
  useFormatDate,
  RouteBuilder,
  InfoTooltipIcon,
} from '@openmsupply-client/common';
import { useIsRequestDisabled, useRequest, useRequestFields } from '../api';
import { AppRoute } from '@openmsupply-client/config';

const AdditionalInfoSection: FC = () => {
  const isDisabled = useIsRequestDisabled();
  const { user, colour, comment, update } = useRequestFields([
    'colour',
    'comment',
    'user',
  ]);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);
  const t = useTranslation('common');

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={color => {
                setBufferedColor(color.hex);
                update({ colour: color.hex });
              }}
              color={bufferedColor ?? ''}
            />
          </PanelField>
        </PanelRow>
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment ?? ''}
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
  const { shipments } = useRequestFields('shipments');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.inbound-shipment-created-on', {
      date: d(new Date(createdDatetime)),
    });

    if (username && username !== 'unknown') {
      tooltip += ` ${t('messages.by-user', { username })}`;
    }

    return tooltip;
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item flexDirection="column" gap={0.5}>
        {!shipments?.totalCount && (
          <PanelLabel>{t('messages.no-shipments-yet')}</PanelLabel>
        )}
        {shipments?.nodes.map(shipment => (
          <Tooltip
            key={shipment.id}
            title={getTooltip(
              shipment.createdDatetime,
              shipment.user?.username
            )}
          >
            <Grid item>
              <RelatedDocumentsRow
                key={shipment.id}
                label={t('label.shipment')}
                value={shipment.invoiceNumber}
                to={RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addPart(String(shipment.invoiceNumber))
                  .build()}
              />
            </Grid>
          </Tooltip>
        ))}
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const { data } = useRequest();
  const { success } = useNotification();
  const t = useTranslation(['replenishment', 'common']);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  return (
    <DetailPanelPortal
      Actions={
        <DetailPanelAction
          icon={<CopyIcon />}
          title={t('link.copy-to-clipboard')}
          onClick={copyToClipboard}
        />
      }
    >
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
    </DetailPanelPortal>
  );
};
