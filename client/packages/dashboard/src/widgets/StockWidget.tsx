import React from 'react';
import {
  ApiException,
  ButtonWithIcon,
  DateUtils,
  FnUtils,
  Grid,
  PlusCircleIcon,
  RANGE_SPLIT_CHAR,
  RouteBuilder,
  StatsPanel,
  useFormatDateTime,
  useFormatNumber,
  useNavigate,
  useNotification,
  useToggle,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import { useDashboard } from '../api';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';
import { useRequest } from '@openmsupply-client/requisitions';
import { AppRoute } from '@openmsupply-client/config';

const LOW_MOS_THRESHOLD = 3;

export const StockWidget: React.FC = () => {
  const t = useTranslation('dashboard');
  const navigate = useNavigate();
  const modalControl = useToggle(false);
  const { error: errorNotification } = useNotification();
  const formatNumber = useFormatNumber();
  const {
    data: expiryData,
    error: expiryError,
    isLoading: isExpiryLoading,
    isError: hasExpiryError,
  } = useDashboard.statistics.stock();
  const {
    data: itemCountsData,
    error: itemCountsError,
    isLoading: isItemStatsLoading,
    isError: hasItemStatsError,
  } = useDashboard.statistics.item(LOW_MOS_THRESHOLD);

  const { mutateAsync: onCreate } = useRequest.document.insert();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = errorNotification(
      t('error.failed-to-create-requisition', { message })
    );
    errorSnack();
  };

  const { customDate, urlQueryDate } = useFormatDateTime();
  const today = new Date();
  const inAMonth = DateUtils.addMonths(today, 1);

  const getExpiredUrlQuery = `${RANGE_SPLIT_CHAR}${customDate(
    today,
    urlQueryDate
  )}`;
  const getExpiredInAMonthUrlQuery = `${customDate(
    today,
    urlQueryDate
  )}${RANGE_SPLIT_CHAR}${customDate(inAMonth, urlQueryDate)}`;

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
            ).then(({ requisitionNumber }) => {
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InternalOrder)
                  .addPart(String(requisitionNumber))
                  .build(),
                { replace: true }
              );
            });
          }}
        />
      ) : null}
      <Widget title={t('inventory-management')}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            <StatsPanel
              error={expiryError as ApiException}
              isError={hasExpiryError}
              isLoading={isExpiryLoading}
              title={t('heading.expiring-stock')}
              stats={[
                {
                  label: t('label.expired', {
                    count: Math.round(expiryData?.expired || 0),
                  }),
                  value: formatNumber.round(expiryData?.expired),
                  link: RouteBuilder.create(AppRoute.Inventory)
                    .addPart(AppRoute.Stock)
                    .addQuery({
                      expiryDate: getExpiredUrlQuery,
                    })
                    .build(),
                },
                {
                  label: t('label.expiring-soon', {
                    count: Math.round(expiryData?.expiringSoon || 0),
                  }),
                  value: formatNumber.round(expiryData?.expiringSoon),
                  link: RouteBuilder.create(AppRoute.Inventory)
                    .addPart(AppRoute.Stock)
                    .addQuery({
                      expiryDate: getExpiredInAMonthUrlQuery,
                    })
                    .build(),
                },
              ]}
              link={RouteBuilder.create(AppRoute.Inventory)
                .addPart(AppRoute.Stock)
                .build()}
            />
            <StatsPanel
              error={itemCountsError as ApiException}
              isError={hasItemStatsError}
              isLoading={isItemStatsLoading}
              title={t('heading.stock-levels')}
              stats={[
                {
                  label: t('label.total-items', {
                    count: Math.round(itemCountsData?.total || 0),
                  }),
                  value: formatNumber.round(itemCountsData?.total || 0),
                },
                {
                  label: t('label.items-no-stock', {
                    count: Math.round(itemCountsData?.noStock || 0),
                  }),
                  value: formatNumber.round(itemCountsData?.noStock || 0),
                },
                {
                  label: t('label.low-stock-items', {
                    count: Math.round(itemCountsData?.lowStock || 0),
                  }),
                  value: formatNumber.round(itemCountsData?.lowStock || 0),
                },
                {
                  label: t('label.more-than-six-months-stock-items', {
                    count: Math.round(
                      itemCountsData?.moreThanSixMonthsStock || 0
                    ),
                  }),
                  value: formatNumber.round(
                    itemCountsData?.moreThanSixMonthsStock || 0
                  ),
                },
              ]}
              link={RouteBuilder.create(AppRoute.Inventory)
                .addPart(AppRoute.Stock)
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
              label={t('button.order-more')}
              onClick={modalControl.toggleOn}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
