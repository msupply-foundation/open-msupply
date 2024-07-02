import React, { FC } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  PanelRow,
  PanelField,
  RouteBuilder,
  Link,
  Tooltip,
} from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';
import { useResponse } from '../api';
import { AppRoute } from '@openmsupply-client/config';

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

export const RelatedDocumentsSection: FC = () => {
  const t = useTranslation('distribution');
  const { localisedDate: d } = useFormatDateTime();
  const { shipments } = useResponse.document.fields('shipments');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.outbound-shipment-created-on', {
      date: d(createdDatetime),
    });

    return (tooltip += ` ${t('messages.by-user', { username })}`);
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item direction="column" container gap={0.5}>
        {!shipments?.totalCount && (
          <PanelLabel>{t('messages.no-shipments-yet')}</PanelLabel>
        )}
        {shipments?.nodes.map(shipment => (
          <Tooltip
            title={getTooltip(
              shipment.createdDatetime,
              shipment.user?.username ?? '-'
            )}
            key={shipment.id}
          >
            <Grid item>
              <RelatedDocumentsRow
                key={shipment.id}
                label={t('label.shipment')}
                value={shipment?.invoiceNumber}
                to={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.OutboundShipment)
                  .addPart(String(shipment?.invoiceNumber))
                  .build()}
              />
            </Grid>
          </Tooltip>
        ))}
      </Grid>
    </DetailPanelSection>
  );
};
