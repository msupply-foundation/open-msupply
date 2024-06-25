import React from 'react';
import { useTranslation } from '@common/intl';
import { Box, Typography, ValueBar } from '@openmsupply-client/common';

export interface ResponseStoreStatsProps {
  stockOnHand: number;
  incomingStock: number;
  stockOnOrder: number;
  requestedQuantity: number;
  otherRequestedQuantity: number;
}

export const ResponseStoreStats: React.FC<ResponseStoreStatsProps> = ({
  stockOnHand,
  incomingStock,
  stockOnOrder,
  requestedQuantity,
  otherRequestedQuantity,
}) => {
  const t = useTranslation('distribution');
  const predictedStockLevels = stockOnHand + incomingStock + stockOnOrder;
  const totalRequested = requestedQuantity + otherRequestedQuantity;

  const predictedStockPercent =
    predictedStockLevels < totalRequested
      ? `${Math.round(
          (100 * predictedStockLevels) / totalRequested
        ).toString()}%`
      : '100%';
  const requestedPercent =
    totalRequested < predictedStockLevels
      ? Math.round((100 * totalRequested) / predictedStockLevels).toString() +
        '%'
      : '100%';

  return (
    <>
      <Box
        flex={1}
        sx={{
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 4,
          paddingBottom: 2,
        }}
      >
        {stockOnHand === 0 && incomingStock === 0 && stockOnOrder === 0 ? (
          <Typography fontSize={14} style={{ textAlign: 'center' }}>
            ⓘ
            <span style={{ fontStyle: 'italic', paddingLeft: 4 }}>
              {t('messages.requisition-no-stock')}
            </span>
          </Typography>
        ) : (
          <Box
            display="flex"
            alignItems="flex-start"
            width={predictedStockPercent}
          >
            <ValueBar
              value={stockOnHand}
              total={predictedStockLevels}
              label={t('label.stock-on-hand')}
              colour="gray.dark"
              startDivider
            />
            <ValueBar
              value={incomingStock}
              total={predictedStockLevels}
              label={t('label.incoming-stock')}
              colour="gray.main"
            />
            <ValueBar
              value={stockOnOrder}
              total={predictedStockLevels}
              label={t('label.stock-on-order')}
              colour="gray.light"
            />
          </Box>
        )}
      </Box>
      <Box
        sx={{
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 4,
          paddingBottom: 2,
        }}
      >
        <Box display="flex" alignItems="flex-start" width={requestedPercent}>
          <ValueBar
            value={requestedQuantity}
            total={totalRequested}
            label={t('label.requested-quantity')}
            colour="primary.main"
            startDivider
          />
          <ValueBar
            value={otherRequestedQuantity}
            total={totalRequested}
            label={t('label.all-requested-quantity')}
            colour="primary.light"
          />
        </Box>
      </Box>
    </>
  );
};
