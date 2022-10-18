import React from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  StatsPanel,
  useFormatNumber,
  useNotification,
  useToggle,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import { useDashboard } from '../api';
import { InternalSupplierSearchModal } from '@openmsupply-client/system';
import { useRequest } from 'packages/requisitions/src/RequestRequisition/api';

const LOW_MOS_THRESHOLD = 3;

export const StockWidget: React.FC = () => {
  const modalControl = useToggle(false);
  const { error } = useNotification();
  const t = useTranslation(['dashboard']);
  const formatNumber = useFormatNumber();
  const { data: expiryData, isLoading: isExpiryLoading } =
    useDashboard.statistics.stock();
  const { data: itemStatsData, isLoading: isItemStatsLoading } =
    useDashboard.statistics.item();
  const [hasExpiryError, setHasExpiryError] = React.useState(false);
  const [hasItemStatsError, setHasItemStatsError] = React.useState(false);

  const lowStockItemsCount =
    itemStatsData?.filter(
      item =>
        item.stats.availableStockOnHand > 0 &&
        (item.stats.availableMonthsOfStockOnHand ?? 0) < LOW_MOS_THRESHOLD
    ).length || 0;

  const noStockItemsCount =
    itemStatsData?.filter(item => item.stats.availableStockOnHand === 0)
      .length || 0;

  React.useEffect(() => {
    if (!isExpiryLoading && expiryData === undefined) setHasExpiryError(true);
    return () => setHasExpiryError(false);
  }, [expiryData, isExpiryLoading]);

  React.useEffect(() => {
    if (!isItemStatsLoading && itemStatsData === undefined)
      setHasItemStatsError(true);
    return () => setHasItemStatsError(false);
  }, [itemStatsData, isItemStatsLoading]);

  const { mutateAsync: onCreate } = useRequest.document.insert();
  const onError = (e: unknown) => {
    const message = (e as Error).message ?? '';
    const errorSnack = error(`Failed to create requisition! ${message}`);
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
            );
          }}
        />
      ) : null}
      <Widget title={t('heading-stock')}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            {!hasExpiryError && (
              <StatsPanel
                isLoading={isExpiryLoading}
                title={t('heading.expiring-stock')}
                stats={[
                  {
                    label: t('label.expired', { ns: 'dashboard' }),
                    value: formatNumber.round(expiryData?.expired),
                  },
                  {
                    label: t('label.expiring-soon'),
                    value: formatNumber.round(expiryData?.expiringSoon),
                  },
                ]}
              />
            )}
            {!hasItemStatsError && (
              <StatsPanel
                isLoading={isItemStatsLoading}
                title={t('heading.stock-levels')}
                stats={[
                  {
                    label: t('label.total-items', { ns: 'dashboard' }),
                    value: formatNumber.round(itemStatsData?.length),
                  },
                  {
                    label: t('label.items-no-stock'),
                    value: formatNumber.round(noStockItemsCount),
                  },
                  {
                    label: t('label.low-stock-items'),
                    value: formatNumber.round(lowStockItemsCount),
                  },
                ]}
              />
            )}
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
