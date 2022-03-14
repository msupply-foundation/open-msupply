import React, { FC } from 'react';
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
