import React, { memo } from 'react';
import {
  PanelRow,
  PanelLabel,
  PanelField,
  Link,
  Grid,
  DetailPanelSection,
  useTranslation,
  useFormatDate,
  RouteBuilder,
  Tooltip,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useOutbound } from '../../api';

const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation('distribution');
  const d = useFormatDate();
  const { requisition } = useOutbound.document.fields('requisition');

  let tooltip = '';
  if (requisition) {
    const { user, createdDatetime } = requisition;
    tooltip = t('messages.customer-requisition-created-on', {
      date: d(new Date(createdDatetime)),
    });
    if (user && user?.username !== 'unknown') {
      tooltip += ` ${t('messages.by-user', {
        user: user?.username,
      })}`;
    }
  }

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item flexDirection="column" container gap={0.5}>
        {!requisition ? (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        ) : (
          <Tooltip title={tooltip}>
            <Grid item>
              <PanelRow>
                <PanelLabel>{t('label.requisition')}</PanelLabel>
                <PanelField>
                  <Link
                    to={RouteBuilder.create(AppRoute.Distribution)
                      .addPart(AppRoute.CustomerRequisition)
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
