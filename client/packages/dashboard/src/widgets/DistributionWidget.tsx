import React from 'react';
import { CustomerSearchModal } from '@openmsupply-client/system';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useNotification,
  Widget,
  FnUtils,
  useToggle,
  ApiException,
  RouteBuilder,
  InvoiceNodeStatus,
  RequisitionNodeStatus,
  useNavigate,
  useAuthContext,
  UserPermission,
  StatsPanel,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import { useOutbound } from '@openmsupply-client/invoices';
import { AppRoute } from '@openmsupply-client/config';
import { useDashboardPanels } from '../hooks';
import { useOutboundCounts, useRequisitionCounts } from '../api';

export const DistributionWidget = ({
  widgetContext,
}: {
  widgetContext: string;
}) => {
  const t = useTranslation();
  const modalControl = useToggle(false);
  const navigate = useNavigate();
  const { error: errorNotification } = useNotification();
  const { userHasPermission } = useAuthContext();
  const formatNumber = useFormatNumber();
  const outbound = useOutboundCounts();
  const requisition = useRequisitionCounts();

  const outboundShipmentsPanelContext = `${widgetContext}-outbound-shipments`;
  const customerRequisitionsPanelContext = `${widgetContext}-customer-requisitions`;

  const { mutateAsync: onCreate } = useOutbound.document.insert();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = errorNotification(
      `Failed to create invoice! ${message}`
    );
    errorSnack();
  };

  const handleClick = () => {
    if (!userHasPermission(UserPermission.OutboundShipmentMutate)) {
      errorNotification(t('error-no-outbound-shipment-create-permission'))();
      return;
    }
    modalControl.toggleOn();
  };

  const corePanels = [
    <StatsPanel
      key={outboundShipmentsPanelContext}
      error={outbound.error as ApiException}
      isError={outbound.isError}
      isLoading={outbound.isLoading}
      title={t('heading.shipments')}
      panelContext={outboundShipmentsPanelContext}
      stats={[
        {
          label: t('label.have-not-shipped'),
          value: formatNumber.round(outbound.stats?.notShipped),
          link: RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .addQuery({
              status: [
                InvoiceNodeStatus.New,
                InvoiceNodeStatus.Allocated,
                InvoiceNodeStatus.Picked,
              ],
            })
            .build(),
          statContext: `${outboundShipmentsPanelContext}-not-shipped`,
        },
      ]}
      link={RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .build()}
    />,
    <StatsPanel
      key={customerRequisitionsPanelContext}
      error={requisition.error as ApiException}
      isError={requisition.isError}
      isLoading={requisition.isLoading}
      title={t('customer-requisition')}
      panelContext={customerRequisitionsPanelContext}
      stats={[
        {
          label: t('label.new'),
          value: formatNumber.round(requisition?.stats?.count),
          link: RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .addQuery({ status: RequisitionNodeStatus.New })
            .build(),
          statContext: `${customerRequisitionsPanelContext}-new`,
        },
        {
          label: t('label.emergency'),
          value: formatNumber.round(requisition?.stats?.emergency),
          link: RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .addQuery({ isEmergency: true })
            .addQuery({ status: RequisitionNodeStatus.New })
            .build(),
          statContext: `${customerRequisitionsPanelContext}-emergency`,
          alertFlag:
            !!requisition.stats?.emergency && requisition.stats?.emergency > 0,
        },
      ]}
      link={RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.CustomerRequisition)
        .build()}
    />,
  ];

  const panels = useDashboardPanels(corePanels, widgetContext);

  return (
    <>
      {modalControl.isOn ? (
        <CustomerSearchModal
          open={true}
          onClose={modalControl.toggleOff}
          onChange={async ({ id: otherPartyId }) => {
            modalControl.toggleOff();
            await onCreate(
              {
                id: FnUtils.generateUUID(),
                otherPartyId,
              },
              { onError }
            ).then(invoiceId => {
              navigate(
                RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.OutboundShipment)
                  .addPart(invoiceId)
                  .build()
              );
            });
          }}
        />
      ) : null}
      <Widget title={t('distribution')}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          {panels}
          <Grid
            flex={1}
            container
            justifyContent="flex-end"
            alignItems="flex-end"
          >
            <ButtonWithIcon
              variant="contained"
              color="secondary"
              Icon={<PlusCircleIcon />}
              label={t('button.new-outbound-shipment')}
              onClick={handleClick}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
