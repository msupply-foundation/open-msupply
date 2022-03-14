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
  useFormatDate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useInboundFields } from '../../api';

export const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation('replenishment');
  const d = useFormatDate();
  const { requisition } = useInboundFields('requisition');

  if (!requisition) {
    return <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>;
  }

  const { createdDatetime, user, requisitionNumber } = requisition;

  let tooltip = t('messages.internal-order-created-on', {
    date: d(new Date(createdDatetime)),
  });
  if (user?.username && user?.username !== 'unknown') {
    tooltip += ` ${t('messages.by-user', { username: user.username })}`;
  }

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item direction="column" gap={0.5}>
        <Tooltip title={tooltip}>
          <Grid item>
            <PanelRow>
              <PanelLabel>{t('label.requisition')}</PanelLabel>
              <PanelField>
                <Link
                  to={RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addPart(String(requisitionNumber))
                    .build()}
                >{`#${requisitionNumber}`}</Link>
              </PanelField>
            </PanelRow>
          </Grid>
        </Tooltip>
      </Grid>
    </DetailPanelSection>
  );
};

export const RelatedDocumentsSection = memo(RelatedDocumentsSectionComponent);
