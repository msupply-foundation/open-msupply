import React from 'react';
import { useIntlUtils, useTranslation } from '@common/intl';
import { Box, Typography, NewValueBar } from '@openmsupply-client/common';
import { RepresentationValue, useValueInUnitsOrPacks } from '../../../common';
import { calculatePercentage, stats } from './utils';

export interface ResponseStoreStatsProps {
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName?: string | null;
  stockOnHand: number;
  incomingStock: number;
  stockOnOrder: number;
  requestedQuantity: number;
  otherRequestedQuantity: number;
}

export const ResponseStoreStats = ({
  representation,
  defaultPackSize,
  unitName,
  stockOnHand,
  incomingStock,
  stockOnOrder,
  requestedQuantity,
  otherRequestedQuantity,
}: ResponseStoreStatsProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const unit = unitName || t('label.unit');

  const statsDisplay = stats(t, getPlural, unit, representation);

  const formattedSOH = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    stockOnHand
  );
  const formattedIncoming = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    incomingStock
  );
  const formattedSOO = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    stockOnOrder
  );
  const formattedRequested = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    requestedQuantity
  );
  const formattedOtherRequested = useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    otherRequestedQuantity
  );

  const predictedStockLevels = formattedSOH + formattedIncoming + formattedSOO;
  const totalRequested = formattedRequested + formattedOtherRequested;

  const predictedStockPercent = calculatePercentage(
    predictedStockLevels,
    totalRequested
  );
  const requestedPercent = calculatePercentage(
    totalRequested,
    predictedStockLevels
  );

  return (
    <Box
      sx={{
        width: 800,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        flex={1}
        sx={{
          p: '4px 8px',
        }}
      >
        {formattedSOH === 0 && formattedIncoming === 0 && formattedSOO === 0 ? (
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
                  value={formattedSOH}
                  total={predictedStockLevels}
                  colour="gray.dark"
                />
                <NewValueBar
                  value={formattedIncoming}
                  total={predictedStockLevels}
                  colour="gray.main"
                />
                <NewValueBar
                  value={formattedSOO}
                  total={predictedStockLevels}
                  colour="gray.light"
                />
              </Box>
              <Box paddingTop={1}>
                {!!formattedSOH &&
                  statsDisplay(
                    'label.stock-on-hand',
                    formattedSOH,
                    'gray.dark'
                  )}
                {!!formattedIncoming &&
                  statsDisplay(
                    'label.incoming-stock',
                    formattedIncoming,
                    'gray.main'
                  )}
                {!!formattedSOO &&
                  statsDisplay(
                    'label.stock-on-order',
                    formattedSOO,
                    'gray.light'
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
        {(!!formattedRequested || !!formattedOtherRequested) && (
          <>
            <Typography style={{ textAlign: 'start' }} variant="h6">
              {t('label.requested')}
            </Typography>
            <Box
              display="flex"
              alignItems="flex-start"
              flexDirection="column"
              width={requestedPercent}
            >
              <Box display="flex" width="100%">
                <NewValueBar
                  value={formattedRequested}
                  total={totalRequested}
                  colour="primary.main"
                />
                <NewValueBar
                  value={formattedOtherRequested}
                  total={totalRequested}
                  colour="primary.light"
                />
              </Box>
              <Box paddingTop={1}>
                {!!formattedRequested &&
                  statsDisplay(
                    'label.requested-quantity',
                    formattedRequested,
                    'primary.main'
                  )}
                {!!formattedOtherRequested &&
                  statsDisplay(
                    'label.other-requested-quantity',
                    formattedOtherRequested,
                    'primary.light'
                  )}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
