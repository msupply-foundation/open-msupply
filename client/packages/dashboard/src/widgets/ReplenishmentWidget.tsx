import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  RANGE_SPLIT_CHAR,
  RouteBuilder,
  StatsPanel,
  useAuthContext,
  useNavigate,
  useNotification,
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
  const { userHasPermission } = useAuthContext();
  const navigate = useNavigate();
  const inboundInternal = useInboundInternalCounts();
  const inboundExternal = useInboundExternalCounts();
  const internalOrder = useInternalOrderCounts();

  const hasInternalPermission =
    userHasPermission(UserPermission.InboundShipmentQuery) ||
    userHasPermission(UserPermission.InboundShipmentMutate) ||
    userHasPermission(UserPermission.InboundShipmentVerify);

  const hasExternalPermission =
    userHasPermission(UserPermission.InboundShipmentExternalQuery) ||
    userHasPermission(UserPermission.InboundShipmentExternalMutate) ||
    userHasPermission(UserPermission.InboundShipmentExternalAuthorise);

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

  const handleClick = () => {
    if (!userHasPermission(UserPermission.InboundShipmentMutate)) {
      errorNotification(t('error-no-inbound-shipment-create-permission'))();
      return;
    }
    modalControl.toggleOn();
  };

  const internalTab = t('label.internal');
  const externalTab = t('label.external');

  const corePanels = [
    ...(hasInternalPermission
      ? [
          <StatsPanel
            key={inboundInternalPanelContext}
            error={inboundInternal.error as ApiException}
            isError={inboundInternal.isError}
            isLoading={inboundInternal.isLoading}
            title={t('inbound-shipment')}
            panelContext={inboundInternalPanelContext}
            stats={[
              {
                label: t('label.today'),
                value: formatNumber.round(inboundInternal.stats?.today),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    createdDatetime: getTodayUrlQuery(),
                    tab: internalTab,
                  })
                  .build(),
                statContext: `${inboundInternalPanelContext}-today`,
              },
              {
                label: t('label.this-week'),
                value: formatNumber.round(inboundInternal.stats?.thisWeek),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    createdDatetime: getThisWeekUrlQuery(),
                    tab: internalTab,
                  })
                  .build(),
                statContext: `${inboundInternalPanelContext}-this-week`,
              },
              {
                label: t('label.inbound-not-delivered'),
                value: formatNumber.round(inboundInternal.stats?.notDelivered),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    status: InvoiceNodeStatus.Shipped,
                    tab: internalTab,
                  })
                  .build(),
                statContext: `${inboundInternalPanelContext}-not-delivered`,
              },
            ]}
            link={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .build()}
          />,
        ]
      : []),
    ...(hasExternalPermission
      ? [
          <StatsPanel
            key={inboundExternalPanelContext}
            error={inboundExternal.error as ApiException}
            isError={inboundExternal.isError}
            isLoading={inboundExternal.isLoading}
            title={t('inbound-shipment-external')}
            panelContext={inboundExternalPanelContext}
            stats={[
              {
                label: t('label.today'),
                value: formatNumber.round(inboundExternal.stats?.today),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    createdDatetime: getTodayUrlQuery(),
                    tab: externalTab,
                  })
                  .build(),
                statContext: `${inboundExternalPanelContext}-today`,
              },
              {
                label: t('label.this-week'),
                value: formatNumber.round(inboundExternal.stats?.thisWeek),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    createdDatetime: getThisWeekUrlQuery(),
                    tab: externalTab,
                  })
                  .build(),
                statContext: `${inboundExternalPanelContext}-this-week`,
              },
              {
                label: t('label.inbound-not-delivered'),
                value: formatNumber.round(inboundExternal.stats?.notDelivered),
                link: RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addQuery({
                    status: InvoiceNodeStatus.Shipped,
                    tab: externalTab,
                  })
                  .build(),
                statContext: `${inboundExternalPanelContext}-not-delivered`,
              },
            ]}
            link={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .addQuery({ tab: externalTab })
              .build()}
          />,
        ]
      : []),
    <StatsPanel
      key={internalOrdersPanelContext}
      error={internalOrder.error as ApiException}
      isError={internalOrder.isError}
      isLoading={internalOrder.isLoading}
      title={t('internal-order')}
      panelContext={internalOrdersPanelContext}
      stats={[
        {
          label: t('label.new'),
          value: formatNumber.round(internalOrder.stats?.count),
          link: RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .addQuery({ status: RequisitionNodeStatus.Draft })
            .build(),
          statContext: `${internalOrdersPanelContext}-new`,
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
      <Widget title={t('replenishment')}>
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
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
