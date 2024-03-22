import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  RANGE_SPLIT_CHAR,
  RouteBuilder,
  StatsPanel,
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
  PropsWithChildrenOnly,
  RequisitionNodeStatus,
} from '@common/types';
import { useDashboard } from '../api';
import { useInbound } from '@openmsupply-client/invoices';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';

export const ReplenishmentWidget: React.FC<PropsWithChildrenOnly> = () => {
  const t = useTranslation('dashboard');
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const formatNumber = useFormatNumber();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useDashboard.statistics.inbound();
  const {
    data: requisitionCount,
    isLoading: isRequisitionCountLoading,
    isError: isRequisitionCountError,
    error: requisitionCountError,
  } = useDashboard.statistics.requisitions();

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

  return (
    <>
      {modalControl.isOn ? (
        <InternalSupplierSearchModal
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
            ).then(invoiceNumber => {
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InboundShipment)
                  .addPart(String(invoiceNumber))
                  .build(),
                { replace: true }
              );
            });
          }}
        />
      ) : null}
      <Widget title={t('replenishment', { ns: 'app' })}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            <StatsPanel
              error={error as ApiException}
              isError={isError}
              isLoading={isLoading}
              title={t('inbound-shipments', { ns: 'app' })}
              stats={[
                {
                  label: t('label.today', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.today),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InboundShipment)
                    .addQuery({
                      createdDatetime: getTodayUrlQuery(),
                    })
                    .build(),
                },
                {
                  label: t('label.this-week', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.thisWeek),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InboundShipment)
                    .addQuery({
                      createdDatetime: getThisWeekUrlQuery(),
                    })
                    .build(),
                },
                {
                  label: t('label.inbound-not-delivered', { ns: 'dashboard' }),
                  value: formatNumber.round(data?.notDelivered),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InboundShipment)
                    .addQuery({ status: InvoiceNodeStatus.Shipped })
                    .build(),
                },
              ]}
              link={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipment)
                .build()}
            />
          </Grid>
          <Grid item>
            <StatsPanel
              error={requisitionCountError as ApiException}
              isError={isRequisitionCountError}
              isLoading={isRequisitionCountLoading}
              title={t('internal-order', { ns: 'app' })}
              stats={[
                {
                  label: t('label.new'),
                  value: formatNumber.round(requisitionCount?.request?.draft),
                  link: RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addQuery({ status: RequisitionNodeStatus.Draft })
                    .build(),
                },
              ]}
              link={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InternalOrder)
                .build()}
            />
          </Grid>
          <Grid
            item
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
              onClick={modalControl.toggleOn}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
