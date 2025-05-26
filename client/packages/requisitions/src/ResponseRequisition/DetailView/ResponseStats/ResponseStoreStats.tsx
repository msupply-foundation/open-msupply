import React from 'react';
import { useTranslation } from '@common/intl';
import { Box, Typography, NewValueBar } from '@openmsupply-client/common';

export interface ResponseStoreStatsProps {
  stockOnHand: number;
  incomingStock: number;
  stockOnOrder: number;
  requestedQuantity: number;
  otherRequestedQuantity: number;
}

export const ResponseStoreStats = ({
  stockOnHand,
  incomingStock,
  stockOnOrder,
  requestedQuantity,
  otherRequestedQuantity,
}: ResponseStoreStatsProps) => {
  const t = useTranslation();
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
    <Box sx={{ minHeight: 200, maxHeight: 400, width: 400 }}>
      <Box
        flex={1}
        sx={{
          p: '4px 8px',
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
          <>
            <Box>
              <Typography variant="h6" style={{ textAlign: 'start' }}>
                {t('label.our-stock')}
              </Typography>
            </Box>
            <Box
              display="flex"
              alignItems="flex-start"
              flexDirection="column"
              width={predictedStockPercent}
            >
              <Box display="flex" width="100%">
                <NewValueBar
                  value={stockOnHand}
                  total={predictedStockLevels}
                  colour="gray.dark"
                />
                <NewValueBar
                  value={incomingStock}
                  total={predictedStockLevels}
                  colour="gray.main"
                />
                <NewValueBar
                  value={stockOnOrder}
                  total={predictedStockLevels}
                  colour="gray.light"
                />
              </Box>
              <Box paddingTop={1}>
                {!!stockOnHand && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        backgroundColor: 'gray.dark',
                        height: 10,
                        width: 10,
                        minWidth: 10,
                        minHeight: 10,
                      }}
                    />
                    <Typography
                      width={150}
                      fontSize={12}
                      style={{ textAlign: 'start' }}
                    >
                      {t('label.stock-on-hand')}
                    </Typography>
                    <Typography fontWeight={800} fontSize={12}>
                      {stockOnHand}
                    </Typography>
                  </Box>
                )}
                {!!incomingStock && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        backgroundColor: 'gray.main',
                        height: 10,
                        width: 10,
                        minWidth: 10,
                        minHeight: 10,
                      }}
                    />
                    <Typography
                      width={150}
                      fontSize={12}
                      style={{ textAlign: 'start' }}
                    >
                      {t('label.incoming-stock')}
                    </Typography>
                    <Typography fontWeight={800} fontSize={12}>
                      {incomingStock}
                    </Typography>
                  </Box>
                )}
                {!!stockOnOrder && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        backgroundColor: 'gray.light',
                        height: 10,
                        width: 10,
                        minWidth: 10,
                        minHeight: 10,
                      }}
                    />
                    <Typography
                      width={150}
                      fontSize={12}
                      style={{ textAlign: 'start' }}
                    >
                      {t('label.stock-on-order')}
                    </Typography>
                    <Typography fontWeight={800} fontSize={12}>
                      {stockOnOrder}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>
      <Box
        sx={{
          p: '4px 8px',
        }}
      >
        {(!!requestedQuantity || !!otherRequestedQuantity) && (
          <>
            <Box>
              <Typography style={{ textAlign: 'start' }} variant="h6">
                {t('label.requested')}
              </Typography>
            </Box>
            <Box
              display="flex"
              alignItems="flex-start"
              flexDirection="column"
              width={requestedPercent}
            >
              <Box display="flex" width="100%">
                <NewValueBar
                  value={requestedQuantity}
                  total={totalRequested}
                  colour="primary.main"
                />
                <NewValueBar
                  value={otherRequestedQuantity}
                  total={totalRequested}
                  colour="primary.light"
                />
              </Box>
              <Box paddingTop={1}>
                {!!requestedQuantity && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        backgroundColor: 'primary.main',
                        height: 10,
                        width: 10,
                        minWidth: 10,
                        minHeight: 10,
                      }}
                    />
                    <Typography
                      width={150}
                      fontSize={12}
                      style={{ textAlign: 'start' }}
                    >
                      {t('label.requested')}
                    </Typography>
                    <Typography fontWeight={800} fontSize={12}>
                      {requestedQuantity}
                    </Typography>
                  </Box>
                )}
                {!!otherRequestedQuantity && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        backgroundColor: 'primary.light',
                        height: 10,
                        width: 10,
                        minWidth: 10,
                        minHeight: 10,
                      }}
                    />
                    <Typography
                      width={150}
                      fontSize={12}
                      style={{ textAlign: 'start' }}
                    >
                      {t('label.other-requested-quantity')}
                    </Typography>
                    <Typography fontWeight={800} fontSize={12}>
                      {otherRequestedQuantity}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
