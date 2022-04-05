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
import { useInboundFields } from '../../api';

export const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation('replenishment');
  const { localisedDate: d } = useFormatDateTime();
  const { requisition } = useInboundFields('requisition');

  let tooltip = '';
  if (requisition) {
    const { user, createdDatetime } = requisition;
    tooltip = t('messages.internal-order-created-on', {
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
        {!requisition ? (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        ) : (
          <Tooltip title={tooltip}>
            <Grid item>
              <PanelRow>
                <PanelLabel>{t('label.requisition')}</PanelLabel>
                <PanelField>
                  <Link
                    to={RouteBuilder.create(AppRoute.Replenishment)
                      .addPart(AppRoute.InternalOrder)
                      .addPart(String(requisition?.requisitionNumber))
                      .build()}
                  >{`#${requisition?.requisitionNumber}`}</Link>
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
