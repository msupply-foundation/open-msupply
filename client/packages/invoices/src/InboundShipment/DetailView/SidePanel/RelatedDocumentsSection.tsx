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
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useInboundShipment } from '../../api';

export const RelatedDocumentsSectionComponent = () => {
  const t = useTranslation();
  const { localisedDate: d } = useFormatDateTime();
  const {
    query: { data },
  } = useInboundShipment();
  const requisition = data?.requisition;
  const purchaseOrder = data?.purchaseOrder;

  const orderedFromDifferentStore = !!requisition?.createdFromRequisitionId;
  let tooltip = '';
  if (requisition) {
    const { user, createdDatetime } = requisition;
    tooltip = t('messages.internal-order-created-on', {
      date: d(new Date(createdDatetime)),
    });
    tooltip += ` ${t('messages.by-user', {
      username: user?.username ?? UNDEFINED_STRING_VALUE,
    })}`;
  }
  const showRequisition = requisition && !orderedFromDifferentStore;

  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid flexDirection="column" gap={0.5}>
        {!showRequisition ? (
          <PanelLabel>{t('messages.no-related-documents')}</PanelLabel>
        ) : (
          <Tooltip title={tooltip}>
            <Grid>
              {showRequisition &&
                <PanelRow>
                  <PanelLabel>{t('label.requisition')}</PanelLabel>
                  <PanelField>
                    <Link
                      to={RouteBuilder.create(AppRoute.Replenishment)
                        .addPart(AppRoute.InternalOrder)
                        .addPart(requisition?.id ?? '')
                        .build()}
                    >{`#${requisition?.requisitionNumber}`}</Link>
                  </PanelField>
                </PanelRow>
              }
              {purchaseOrder &&
                <PanelRow>
                  <PanelLabel>{t('label.purchase-order')}</PanelLabel>
                  <PanelField>
                    <Link
                      to={RouteBuilder.create(AppRoute.Replenishment)
                        .addPart(AppRoute.PurchaseOrder)
                        .addPart(purchaseOrder?.id ?? '')
                        .build()}
                    >{`#${purchaseOrder?.number}`}</Link>
                  </PanelField>
                </PanelRow>
              }
            </Grid>
          </Tooltip>
        )}
      </Grid>
    </DetailPanelSection>
  );
};

export const RelatedDocumentsSection = memo(RelatedDocumentsSectionComponent);
