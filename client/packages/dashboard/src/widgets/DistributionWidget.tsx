import React from 'react';
import { CustomerSearchModal } from '@openmsupply-client/system';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useNotification,
  StatsPanel,
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
  usePluginProvider,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import { useDashboard } from '../api';
import { useOutbound } from '@openmsupply-client/invoices';
import { AppRoute } from '@openmsupply-client/config';

export const DistributionWidget = () => {
  const t = useTranslation();
  const modalControl = useToggle(false);
  const navigate = useNavigate();
  const { plugins } = usePluginProvider();
  const { error: errorNotification } = useNotification();
  const { userHasPermission } = useAuthContext();
  const formatNumber = useFormatNumber();
  const {
    data: outboundCount,
    isLoading: isOutboundCountLoading,
    isError: isOutboundCountError,
    error: outboundCountError,
  } = useDashboard.statistics.outbound();
  const {
    data: requisitionCount,
    isLoading: isRequisitionCountLoading,
    isError: isRequisitionCountError,
    error: requisitionCountError,
  } = useDashboard.statistics.requisitions();

  const widgetContext = 'distribution';
  const outboundShipmentsPanelContext = 'outbound-shipments';
  const customerRequisitionsPanelContext = 'customer-requisitions';

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

  const pluginPanels = plugins.dashboard?.panel?.map((Component, index) => (
    <Component key={index} widgetContext={widgetContext} />
  ));

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
          <Grid>
            <StatsPanel
              error={outboundCountError as ApiException}
              isError={isOutboundCountError}
              isLoading={isOutboundCountLoading}
              title={t('heading.shipments')}
              panelContext={`${widgetContext}-${outboundShipmentsPanelContext}`}
              stats={[
                {
                  label: t('label.have-not-shipped'),
                  value: formatNumber.round(outboundCount?.notShipped),
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
                  statContext: `${widgetContext}-${outboundShipmentsPanelContext}-not-shipped`,
                },
              ]}
              link={RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.OutboundShipment)
                .build()}
            />
          </Grid>
          <Grid>
            <StatsPanel
              error={requisitionCountError as ApiException}
              isError={isRequisitionCountError}
              isLoading={isRequisitionCountLoading}
              title={t('customer-requisition')}
              panelContext={`${widgetContext}-${customerRequisitionsPanelContext}`}
              stats={[
                {
                  label: t('label.new'),
                  value: formatNumber.round(requisitionCount?.response?.new),
                  link: RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.CustomerRequisition)
                    .addQuery({ status: RequisitionNodeStatus.New })
                    .build(),
                  statContext: `${widgetContext}-${customerRequisitionsPanelContext}-new`,
                },
                {
                  label: t('label.emergency'),
                  value: formatNumber.round(requisitionCount?.emergency?.new),
                  link: RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.CustomerRequisition)
                    .addQuery({ isEmergency: true })
                    .addQuery({ status: RequisitionNodeStatus.New })
                    .build(),
                  statContext: `${widgetContext}-${customerRequisitionsPanelContext}-emergency`,
                  alertFlag:
                    !!requisitionCount?.emergency?.new &&
                    requisitionCount?.emergency?.new > 0,
                },
              ]}
              link={RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.CustomerRequisition)
                .build()}
            />
            {pluginPanels}
          </Grid>
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
