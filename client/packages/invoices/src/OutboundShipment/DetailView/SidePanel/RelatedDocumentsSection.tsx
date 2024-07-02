import React, { memo } from 'react';
import {
  PanelRow,
  PanelLabel,
  PanelField,
  Link,
  Grid,
  DetailPanelSection,
  useTranslation,
  useFormatDateTime,
  RouteBuilder,
  Tooltip,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useOutbound } from '../../api';

const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation('distribution');
  const { localisedDate: d } = useFormatDateTime();
  const { requisition } = useOutbound.document.fields('requisition');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.customer-requisition-created-on', {
      date: d(createdDatetime),
    });
    return (tooltip += ` ${t('messages.by-user', { username })}`);
  };

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item flexDirection="column" container gap={0.5}>
        {!requisition ? (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        ) : (
          <Tooltip
            title={getTooltip(
              requisition.createdDatetime,
              requisition.user?.username ?? UNDEFINED_STRING_VALUE
            )}
          >
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
