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
  usePluginProvider,
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
  PropsWithChildrenOnly,
  RequisitionNodeStatus,
  UserPermission,
} from '@common/types';
import { useDashboard } from '../api';
import { useInbound } from '@openmsupply-client/invoices';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';

export const ReplenishmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const t = useTranslation();
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const formatNumber = useFormatNumber();
  const { userHasPermission } = useAuthContext();
  const navigate = useNavigate();
  const { plugins } = usePluginProvider();
  const { data, isLoading, isError, error } = useDashboard.statistics.inbound();
  const {
    data: requisitionCount,
    isLoading: isRequisitionCountLoading,
    isError: isRequisitionCountError,
    error: requisitionCountError,
  } = useDashboard.statistics.requisitions();

  const widgetContext = 'replenishment';
  const inboundShipmentsPanelContext = 'inbound-shipments';
  const internalOrdersPanelContext = 'internal-orders';

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

  const { mutateAsync: onCreate } = useInbound.document.insert();
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

  const pluginPanels = plugins.dashboard?.panel?.map((Plugin, index) => (
    <Plugin key={index} widgetContext={widgetContext} />
  ));

  return (
    <>
      {modalControl.isOn ? (
        <SupplierSearchModal
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
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addPart(invoiceId)
                  .build()
              );
            });
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
          <Grid>
            <StatsPanel
              error={error as ApiException}
              isError={isError}
              isLoading={isLoading}
              title={t('inbound-shipment')}
              panelContext={`${widgetContext}-${inboundShipmentsPanelContext}`}
              stats={[
                {
                  label: t('label.today'),
                  value: formatNumber.round(data?.today),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InboundShipment)
                    .addQuery({
                      createdDatetime: getTodayUrlQuery(),
                    })
                    .build(),
                  statContext: `${widgetContext}-${inboundShipmentsPanelContext}-today`,
                },
                {
                  label: t('label.this-week'),
                  value: formatNumber.round(data?.thisWeek),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InboundShipment)
                    .addQuery({
                      createdDatetime: getThisWeekUrlQuery(),
                    })
                    .build(),
                  statContext: `${widgetContext}-${inboundShipmentsPanelContext}-this-week`,
                },
                {
                  label: t('label.inbound-not-delivered'),
                  value: formatNumber.round(data?.notDelivered),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InboundShipment)
                    .addQuery({ status: InvoiceNodeStatus.Shipped })
                    .build(),
                  statContext: `${widgetContext}-${inboundShipmentsPanelContext}-not-delivered`,
                },
              ]}
              link={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipment)
                .build()}
            />
          </Grid>
          <Grid>
            <StatsPanel
              error={requisitionCountError as ApiException}
              isError={isRequisitionCountError}
              isLoading={isRequisitionCountLoading}
              title={t('internal-order')}
              panelContext={`${widgetContext}-${internalOrdersPanelContext}`}
              stats={[
                {
                  label: t('label.new'),
                  value: formatNumber.round(requisitionCount?.request?.draft),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addQuery({ status: RequisitionNodeStatus.Draft })
                    .build(),
                  statContext: `${widgetContext}-${internalOrdersPanelContext}-new`,
                },
              ]}
              link={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InternalOrder)
                .build()}
            />
          </Grid>
          {pluginPanels}
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
