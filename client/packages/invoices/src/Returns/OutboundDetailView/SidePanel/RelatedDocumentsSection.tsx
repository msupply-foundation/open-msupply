import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  Link,
  useFormatDateTime,
  RouteBuilder,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useReturns } from '../../api';

export const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation('replenishment');
  const { localisedDate: d } = useFormatDateTime();
  const { data } = useReturns.document.outboundReturn();
  const { originalShipment } = data ?? {};

  const getLabel = (createdDatetime: string, username?: string) => {
    const label = t('messages.outbound-shipment-created-on', {
      date: d(new Date(createdDatetime)),
    });

    return `${label} ${t('messages.by-user', { username })}`;
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item flexDirection="column" gap={0.5}>
        {!originalShipment ? (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        ) : (
          <Grid item>
            <PanelRow>
              <PanelLabel>
                {getLabel(
                  originalShipment.createdDatetime,
                  originalShipment.user?.username ?? UNDEFINED_STRING_VALUE
                )}
              </PanelLabel>
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
        )}
      </Grid>
    </DetailPanelSection>
  );
};

export const RelatedDocumentsSection = memo(RelatedDocumentsSectionComponent);
