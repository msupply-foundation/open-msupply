import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  Tooltip,
  Link,
  useFormatDateTime,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useReturns } from '../../api';

export const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation('replenishment');
  const { localisedDate: d } = useFormatDateTime();
  const { data } = useReturns.document.outboundReturn();
  const { originalShipment } = data ?? {};

  let tooltip = '';
  if (originalShipment) {
    const { user, createdDatetime } = originalShipment;
    tooltip = t('messages.inbound-shipment-created-on', {
      date: d(new Date(createdDatetime)),
    });
    if (user?.username && user.username !== 'unknown') {
      tooltip += ` ${t('messages.by-user', {
        username: user?.username,
      })}`;
    }
  }

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item flexDirection="column" gap={0.5}>
        {!originalShipment ? (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        ) : (
          <Tooltip title={tooltip}>
            <Grid item>
              <PanelRow>
                <PanelLabel>{t('label.inbound-shipment')}</PanelLabel>
                <PanelField>
                  <Link
                    to={RouteBuilder.create(AppRoute.Replenishment)
                      .addPart(AppRoute.InboundShipment)
                      .addPart(String(originalShipment?.invoiceNumber))
                      .build()}
                  >{`#${originalShipment?.invoiceNumber}`}</Link>
                </PanelField>
              </PanelRow>
            </Grid>
          </Tooltip>
        )}
      </Grid>
    </DetailPanelSection>
  );
};

export const RelatedDocumentsSection = memo(RelatedDocumentsSectionComponent);
