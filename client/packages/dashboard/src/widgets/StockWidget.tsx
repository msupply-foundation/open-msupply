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
import { useRequest } from '@openmsupply-client/requisitions';

const LOW_MOS_THRESHOLD = 3;

export const StockWidget: React.FC = () => {
  const modalControl = useToggle(false);
  const { error } = useNotification();
  const t = useTranslation('dashboard');
  const formatNumber = useFormatNumber();
  const { data: expiryData, isLoading: isExpiryLoading } =
    useDashboard.statistics.stock();
  const { data: itemCountsData, isLoading: isItemStatsLoading } =
    useDashboard.statistics.item(LOW_MOS_THRESHOLD);
  const [hasExpiryError, setHasExpiryError] = React.useState(false);
  const [hasItemStatsError, setHasItemStatsError] = React.useState(false);

  React.useEffect(() => {
    if (!isExpiryLoading && expiryData === undefined) setHasExpiryError(true);
    return () => setHasExpiryError(false);
  }, [expiryData, isExpiryLoading]);

  React.useEffect(() => {
    if (!isItemStatsLoading && itemCountsData === undefined)
      setHasItemStatsError(true);
    return () => setHasItemStatsError(false);
  }, [itemCountsData, isItemStatsLoading]);

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
                    label: t('label.expired', {
                      count: Math.round(expiryData?.expired || 0),
                    }),
                    value: formatNumber.round(expiryData?.expired),
                  },
                  {
                    label: t('label.expiring-soon', {
                      count: Math.round(expiryData?.expiringSoon || 0),
                    }),
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
