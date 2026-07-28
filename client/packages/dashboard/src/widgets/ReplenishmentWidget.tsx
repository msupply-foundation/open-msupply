import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  RANGE_SPLIT_CHAR,
  RouteBuilder,
  StatsPanel,
  useCallbackWithPermission,
  useNavigate,
  useNotification,
  usePreferences,
  useToggle,
  Widget,
} from '@openmsupply-client/common';
import {
  DateUtils,
  useFormatDateTime,
  useFormatNumber,
  useTranslation,
} from '@common/intl';
import {
  ApiException,
  InvoiceNodeStatus,
  InvoiceTypeInput,
  RequisitionNodeStatus,
  UserPermission,
} from '@common/types';
import { useInboundShipment } from '@openmsupply-client/invoices';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { useDashboardPanels } from '../hooks';
import {
  useInboundInternalCounts,
  useInboundExternalCounts,
  useInternalOrderCounts,
} from '../api';

export const ReplenishmentWidget = ({
  widgetContext,
}: {
  widgetContext: string;
}) => {
  const t = useTranslation();
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const formatNumber = useFormatNumber();
  const navigate = useNavigate();
  const { useProcurementFunctionality } = usePreferences();
  const inboundInternal = useInboundInternalCounts();
  const inboundExternal = useInboundExternalCounts(useProcurementFunctionality);
  const internalOrder = useInternalOrderCounts();

  const inboundInternalPanelContext = `${widgetContext}-inbound-shipments-internal`;
  const inboundExternalPanelContext = `${widgetContext}-inbound-shipments-external`;
  const internalOrdersPanelContext = `${widgetContext}-internal-orders`;

  const { customDate, urlQueryDateTime } = useFormatDateTime();

  const getTodayUrlQuery = () => {
    const startOfDay = DateUtils.startOfDay(new Date());
    const endOfDay = DateUtils.endOfDay(new Date());

    return `${customDate(
      startOfDay,
      urlQueryDateTime
    )}${RANGE_SPLIT_CHAR}${customDate(endOfDay, urlQueryDateTime)}`;
  };

  const getThisWeekUrlQuery = () => {
    const previousMonday = DateUtils.startOfDay(
      DateUtils.previousMonday(new Date())
    );
    const endOfWeek = DateUtils.endOfDay(
      DateUtils.endOfWeek(new Date(), { weekStartsOn: 1 })
    );

    return `${customDate(
      previousMonday,
      urlQueryDateTime
    )}${RANGE_SPLIT_CHAR}${customDate(endOfWeek, urlQueryDateTime)}`;
  };

  const {
    create: { create: onCreate },
  } = useInboundShipment();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = errorNotification(
      t('error.failed-to-create-requisition', { message })
    );
    errorSnack();
  };
  const handleClick = useCallbackWithPermission(
    UserPermission.InboundShipmentMutate,
    modalControl.toggleOn
  );

  const internalType = InvoiceTypeInput.InboundShipment;
  const externalType = InvoiceTypeInput.InboundShipmentExternal;

  const corePanels = [
    <StatsPanel
      key={inboundInternalPanelContext}
      error={inboundInternal.error as unknown as ApiException}
      isError={inboundInternal.isError}
      isLoading={inboundInternal.isLoading}
      title={t('inbound-shipment')}
      panelContext={inboundInternalPanelContext}
      testId="dashboard-panel-replenishment.inbound"
      stats={[
        {
          label: t('label.today'),
          value: formatNumber.round(inboundInternal.stats?.today),
          link: RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .addQuery({
              createdDatetime: getTodayUrlQuery(),
              type: internalType,
            })
            .build(),
          statContext: `${inboundInternalPanelContext}-today`,
          testId: 'dashboard-stat-replenishment.inbound.today',
        },
        {
          label: t('label.this-week'),
          value: formatNumber.round(inboundInternal.stats?.thisWeek),
          link: RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .addQuery({
              createdDatetime: getThisWeekUrlQuery(),
              type: internalType,
            })
            .build(),
          statContext: `${inboundInternalPanelContext}-this-week`,
          testId: 'dashboard-stat-replenishment.inbound.this-week',
        },
        {
          label: t('label.inbound-not-delivered'),
          value: formatNumber.round(inboundInternal.stats?.notDelivered),
          link: RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .addQuery({
              status: `${InvoiceNodeStatus.Shipped},${InvoiceNodeStatus.New}`,
              type: internalType,
            })
            .build(),
          statContext: `${inboundInternalPanelContext}-not-delivered`,
          testId: 'dashboard-stat-replenishment.inbound.not-delivered',
        },
      ]}
      link={RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .build()}
    />,
    ...(useProcurementFunctionality
      ? [
          <StatsPanel
            key={inboundExternalPanelContext}
            error={inboundExternal.error as unknown as ApiException}
            isError={inboundExternal.isError}
            isLoading={inboundExternal.isLoading}
            title={t('dashboard.inbound-shipment-external')}
            panelContext={inboundExternalPanelContext}
            testId="dashboard-panel-replenishment.inbound-external"
            stats={[
              {
                label: t('label.today'),
                value: formatNumber.round(inboundExternal.stats?.today),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    createdDatetime: getTodayUrlQuery(),
                    type: externalType,
                  })
                  .build(),
                statContext: `${inboundExternalPanelContext}-today`,
                testId: 'dashboard-stat-replenishment.inbound-external.today',
              },
              {
                label: t('label.this-week'),
                value: formatNumber.round(inboundExternal.stats?.thisWeek),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    createdDatetime: getThisWeekUrlQuery(),
                    type: externalType,
                  })
                  .build(),
                statContext: `${inboundExternalPanelContext}-this-week`,
                testId:
                  'dashboard-stat-replenishment.inbound-external.this-week',
              },
              {
                label: t('label.inbound-not-delivered'),
                value: formatNumber.round(inboundExternal.stats?.notDelivered),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    status: `${InvoiceNodeStatus.Shipped},${InvoiceNodeStatus.New}`,
                    type: externalType,
                  })
                  .build(),
                statContext: `${inboundExternalPanelContext}-not-delivered`,
                testId:
                  'dashboard-stat-replenishment.inbound-external.not-delivered',
              },
            ]}
            link={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .addQuery({ type: externalType })
              .build()}
          />,
        ]
      : []),
    <StatsPanel
      key={internalOrdersPanelContext}
      error={internalOrder.error as unknown as ApiException}
      isError={internalOrder.isError}
      isLoading={internalOrder.isLoading}
      title={t('internal-order')}
      panelContext={internalOrdersPanelContext}
      testId="dashboard-panel-replenishment.internal-order"
      stats={[
        {
          label: t('label.draft'),
          value: formatNumber.round(internalOrder.stats?.count),
          link: RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .addQuery({ status: RequisitionNodeStatus.Draft })
            .build(),
          statContext: `${internalOrdersPanelContext}-new`,
          testId: 'dashboard-stat-replenishment.internal-order.draft',
        },
      ]}
      link={RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InternalOrder)
        .build()}
    />,
  ];

  const panels = useDashboardPanels(corePanels, widgetContext);

  return (
    <>
      {modalControl.isOn ? (
        <SupplierSearchModal
          open={true}
          onClose={modalControl.toggleOff}
          onChange={async ({ id: otherPartyId }) => {
            modalControl.toggleOff();
            try {
              const invoiceId = await onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId,
              });
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addPart(invoiceId)
                  .build()
              );
            } catch (e) {
              onError(e);
            }
          }}
        />
      ) : null}
      <Widget
        title={t('replenishment')}
        testId="dashboard-widget-replenishment"
      >
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
              label={t('button.new-inbound-shipment')}
              onClick={handleClick}
              data-testid="dashboard-create-replenishment"
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
