import React, { FC, memo } from 'react';
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
import { useOutboundFields } from '../../api';

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

const RelatedDocumentsSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  const d = useFormatDate();
  const { requisition } = useOutboundFields('requisition');

  const getTooltip = (createdDatetime: string, username?: string) => {
    let tooltip = t('messages.customer-requisition-created-on', {
      date: d(new Date(createdDatetime)),
    });

    if (username && username !== 'unknown') {
      tooltip += ` ${t('messages.by-user', { username })}`;
    }

    return tooltip;
  };
  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid item direction="column" container gap={0.5}>
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
                key={requisition.id}
                label={t('label.requisition')}
                value={requisition.requisitionNumber}
                to={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
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

export const RelatedDocumentsSection = memo(RelatedDocumentsSectionComponent);
